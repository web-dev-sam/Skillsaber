

export default class DBHandler {

    constructor() {
        this.db = this.initDB();
    }


    initDB() {
        const db = new Dexie("SkillsaberDB");
        db.version(3).stores({
            players: "id, name, profilePicture, country, pp, rank, countryRank, averageRankedAccuracy, totalPlayCount, rankedPlayCount, replaysWatched, isMyProfile",
            plays: "id, rank, accuracy, pp, playerId, weight, modifiers, badCuts, missedNotes, maxCombo, fullCombo, timeSet, hasReplay, leaderboardId, closePlayers, playWorth",
            maps: "leaderboardId, songHash, songName, songSubName, songAuthorName, levelAuthorName, difficulty, difficultyRaw, ranked, qualified, stars, coverImage",
        });
        return db;
    }


    deletePlayerData() {
        this.db.delete();
    }


    async fetchPlayerInfo(playerId) {
        try {
            const fetchurl = `/api/player?id=${playerId}`;
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log("GET", fetchurl);
            const response = await fetch(fetchurl);
            if (response.status !== 200) {
                console.log(await response.json());
                return null;
            }

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
        } catch (e) {
            console.error(e);
            return null;
        }
    }


    async updatePlayerInfo(playerId, update, onUpdate) {
        const oldPlayer = await this.getPlayerInfo(playerId);
        if (oldPlayer != null && !update) {
            return;
        }

        const playerData = await this.fetchPlayerInfo(playerId);
        if (playerData == null) {
            console.error("UPDATE | Player not found", playerId);
            return;
        }

        // Update player data
        this.db.open().then(() => {
            this.db.players.add(playerData);
        }).catch (Dexie.MissingAPIError, (e) => {
            console.error("Couldn't find indexedDB API");
        }).catch ('SecurityError', (e) =>  {
            console.error("SecurityError - This browser doesn't like fiddling with indexedDB.");
        }).catch ((e) =>  {
            console.log("ERROR");
            console.error(e);
        }).finally(() => {
            onUpdate();
        });
    }


    async fetchPlayerPlays(playerId, page) {
        try {
            const fetchurl = `/api/plays?id=${playerId}&page=${page}&sortmode=recent`;
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log("GET", fetchurl);
            const response = await fetch(fetchurl);
            const playerData = await response.json();

            const plays = [];
            playerData.playerScores = playerData.playerScores.filter(play => play.score && play.score.pp > 0 && play.leaderboard.difficulty.gameMode === "SoloStandard");
            for (const play of playerData.playerScores) {
                
                const closePlayers = await this.fetchClosePlayers(play.score.rank, play.leaderboard.id);
                await this.updateClosePlayersProfiles(closePlayers);
                const playWorth = await this.calcPlayWorth(closePlayers);

                plays.push({
                    id: play.score.id,
                    rank: play.score.rank,
                    accuracy: play.leaderboard.maxScore === 0? 
                        0 : 
                        Math.round(play.score.baseScore / play.leaderboard.maxScore * 10000) / 100,
                    pp: play.score?.pp,
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
                    closePlayers: closePlayers,
                    playWorth: playWorth,
                });
            }
            const maps = playerData.playerScores.map(play => {
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
        } catch (e) {
            console.error(e);
            return null;
        }
    }


    async fetchClosePlayers(rank, leaderboard) {
        const fetchurl = `/api/closePlayers?rank=${rank}&leaderboard=${leaderboard}`;
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("GET", fetchurl);
        const response = await fetch(fetchurl);
        const closePlayers = await response.json();
        console.log("CLOSE PLAYERS", closePlayers);
        return closePlayers.map(player => player.leaderboardPlayerInfo.id);
    }


    async updatePlayerPlays(playerId, onUpdate, onFinish, page=1, rankedMaps=0) {
        if (rankedMaps >= 10) {
            onFinish();
            return;
        }
        const playerPlaysData = await this.fetchPlayerPlays(playerId, page);
        if (playerPlaysData == null) {
            throw new Error("Error while fetching player plays");
        }

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
        if (remotePlays.length > 0 && newestLocalPlayTime >= newestRemotePlayTime && !overwrite) {
            onFinish();
            return;
        }
        const restRemotePlays = remotePlays.filter(play => play.pp > 0).slice(0, 10 - rankedMaps);

        // Also update the maps
        await this.updateMaps(playerPlaysData.maps, onUpdate);
        
        // If we dont, fetch the data until we have all the plays
        this.db.open().then(() => {
            return this.db.plays.where("playerId").equals(playerId).toArray();
        }).then((plays) => {
            if (plays.length === 0) {
                return this.db.plays.bulkAdd(restRemotePlays);
            }
            return this.db.plays.bulkPut(restRemotePlays);
        }).then(async () => {
            onUpdate();
            await this.updatePlayerPlays(playerId, onUpdate, onFinish, page+1, rankedMaps + restRemotePlays.length);
        }).catch (Dexie.MissingAPIError, (e) => {
            console.error("Couldn't find indexedDB API");
        }).catch ('SecurityError', (e) =>  {
            console.error("SecurityError - This browser doesn't like fiddling with indexedDB.");
        }).catch ((e) =>  {
            console.error(e);
        });
    }


    async calcPlayWorth(closePlayers) {
        if (closePlayers.length === 0) {
            return 0;
        }

        const playerPPs = await Promise.all(
            closePlayers.map(async playerId => {
                const player = await this.getPlayerInfo(playerId);
                return player.pp;
            })
        );

        const playerPPsSum = playerPPs.reduce((a, b) => a + b, 0);
        const playersPlayWorth = playerPPsSum / playerPPs.length;
        return Math.round(playersPlayWorth);
    }


    async updateClosePlayersProfiles(playerIds) {
        for (const playerId of playerIds) {
            await this.updatePlayerInfo(playerId, false, () => {});
        }
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
        });
    }


    getPlayerInfo(playerId) {
        return this.db.transaction('r', [this.db.players], async () => {
            return await this.db.players.get(playerId);
        });
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
