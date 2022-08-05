

export default class DBHandler {

    constructor() {
        this.db = this.initDB();
    }


    initDB() {
        const db = new Dexie("SkillsaberDB");
        db.version(1).stores({
            players: `id, name, profilePicture, country, pp, rank, countryRank, averageRankedAccuracy, totalPlayCount, rankedPlayCount, replaysWatched, isMyProfile`,
            plays: `id, rank, accuracy, pp, playerId, weight, modifiers, badCuts, missedNotes, maxCombo, fullCombo, timeSet, hasReplay, leaderboardId`,
            maps: `leaderboardId, songHash, songName, songSubName, songAuthorName, levelAuthorName, difficulty, difficultyRaw, ranked, qualified, stars, coverImage`,
        });
        return db;
    }


    deletePlayerData(playerId) {
        return this.db.transaction('rw', [this.db.players], async () => {
            return await this.db.players.delete(playerId);
        }).then(() => {
            return this.db.transaction('rw', [this.db.plays], async () => {
                return await this.db.plays.where("playerId").equals(playerId).delete();
            });
        });
    }


    async fetchPlayerInfo(playerId) {
        const fetchurl = `/api/player?id=${playerId}`;
        const response = await fetch(fetchurl);
        const playerData = await response.json();
        const data = {
            id: playerData.id,
            name: playerData.name,
            profilePicture: playerData.profilePicture,
            country: playerData.country,
            pp: playerData.pp,
            rank: playerData.rank,
            countryRank: playerData.countryRank,
            averageRankedAccuracy: playerData.scoreStats.averageRankedAccuracy,
            totalPlayCount: playerData.scoreStats.totalPlayCount,
            rankedPlayCount: playerData.scoreStats.rankedPlayCount,
            replaysWatched: playerData.scoreStats.replaysWatched,
        };
        return data;
    }


    async updatePlayerInfo(playerId, onUpdate) {
        const playerData = await this.fetchPlayerInfo(playerId);
        console.log("player", playerData);

        // Update player data
        this.db.open().then(() => {
            return this.db.players.get(playerId);
        }).then((player) => {
            if (player == null) {
                return this.db.players.add(playerData);
            }
            return this.db.players.update(playerId, playerData);
        }).catch (Dexie.MissingAPIError, (e) => {
            console.error("Couldn't find indexedDB API");
        }).catch ('SecurityError', (e) =>  {
            console.error("SecurityError - This browser doesn't like fiddling with indexedDB.");
        }).catch ((e) =>  {
            console.error(e);
        }).finally(() => {
            onUpdate();
        });
    }


    getPlayerInfo(playerId) {
        return this.db.transaction('r', [this.db.players], async () => {
            return await this.db.players.get(playerId);
        });
    }


    async fetchPlayerPlays(playerId, page) {
        const fetchurl = `/api/plays?id=${playerId}&page=${page}&sortmode=recent`;
        const response = await fetch(fetchurl);
        const playerData = await response.json();
        const plays = playerData.playerScores.map((play) => {
            return {
                id: play.score.id,
                rank: play.score.rank,
                accuracy: play.leaderboard.maxScore === 0? 
                    0 : 
                    Math.round(play.score.baseScore / play.leaderboard.maxScore * 10000) / 100,
                pp: play.score.pp,
                playerId,
                weight: play.score.weight,
                modifiers: play.score.modifiers,
                badCuts: play.score.badCuts,
                missedNotes: play.score.missedNotes,
                maxCombo: play.score.maxCombo,
                fullCombo: play.score.fullCombo,
                timeSet: play.score.timeSet,
                hasReplay: play.score.hasReplay,
                leaderboardId: play.leaderboard.id,
            }
        });
        const maps = playerData.playerScores.map((play) => {
            return {
                leaderboardId: play.leaderboard.id,
                songHash: play.leaderboard.songHash,
                songName: play.leaderboard.songName,
                songSubName: play.leaderboard.songSubName,
                songAuthorName: play.leaderboard.songAuthorName,
                levelAuthorName: play.leaderboard.levelAuthorName,
                difficulty: play.leaderboard.difficulty.difficulty,
                difficultyRaw: play.leaderboard.difficulty.difficultyRaw,
                ranked: play.leaderboard.ranked,
                qualified: play.leaderboard.qualified,
                stars: play.leaderboard.stars,
                coverImage: play.leaderboard.coverImage,
            }
        });
        const metadata = playerData.metadata;

        return {
            plays,
            maps,
            metadata,
        };
    }


    async updatePlayerPlays(playerId, onUpdate, onFinish, page=1) {
        if (page === 6) {
            onFinish();
            return;
        }
        console.log("done");
        const playerPlaysData = await this.fetchPlayerPlays(playerId, page);
        if (playerPlaysData.plays.length == 0) {
            onFinish();
            return;
        }
        console.log("done 1");
        console.log("Fetching recent plays page", page, playerPlaysData);

        // Check if we already have this player's plays in the local database

        let newestLocalPlayTime;
        if (page === 1) {
            const localPlays = await this.getPlays(playerId);
            newestLocalPlayTime = Math.max(
                ...localPlays.map(play => new Date(play.timeSet))
            );
            if (localPlays.length === 0) {
                window.FIRST_LOAD = true;
            }
        }

        const overwrite = false;
        const remotePlays = playerPlaysData.plays;
        const newestRemotePlayTime = Math.max(
            ...remotePlays.map(play => new Date(play.timeSet))
        );
        if (newestLocalPlayTime >= newestRemotePlayTime && !overwrite) {
            onFinish();
            return;
        }
        console.log("done 2");

        // Also update the maps
        await this.updateMaps(playerPlaysData.maps, onUpdate);
        
        // If we dont, fetch the data until we have all the plays
        this.db.open().then(() => {
            return this.db.plays.where("playerId").equals(playerId).toArray();
        }).then((plays) => {
            if (plays.length == 0) {
                return this.db.plays.bulkAdd(remotePlays);
            }
            return this.db.plays.bulkPut(remotePlays);
        }).then(() => {
            setTimeout(async() => {
                await this.updatePlayerPlays(playerId, onUpdate, onFinish, page+1);
            }, 800);
        }).catch (Dexie.MissingAPIError, (e) => {
            console.error("Couldn't find indexedDB API");
        }).catch ('SecurityError', (e) =>  {
            console.error("SecurityError - This browser doesn't like fiddling with indexedDB.");
        }).catch ((e) =>  {
            console.error(e);
        }).finally(() => {
            onUpdate({
                progress: page,
                total: Math.floor(playerPlaysData.metadata.total / playerPlaysData.metadata.itemsPerPage),
            });
        });
    }


    async updateMaps(maps, onUpdate) {
        await this.db.open().then(() => {
            return this.db.maps.bulkPut(maps);
        }).catch (Dexie.MissingAPIError, (e) => {
            console.error("Couldn't find indexedDB API");
        }).catch ('SecurityError', (e) =>  {
            console.error("SecurityError - This browser doesn't like fiddling with indexedDB.");
        }).catch ((e) =>  {
            console.error(e);
        }).finally(() => {
            onUpdate();
        });;
    }


    getPlays(playerId) {
        return this.db.transaction('r', [this.db.plays], async () => {
            return await this.db.plays.where("playerId").equals(playerId).toArray();
        });
    }


    getMaps() {
        return this.db.transaction('r', [this.db.maps], async () => {
            return await this.db.maps.toArray();
        });
    }

}
