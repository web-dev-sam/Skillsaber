
import DBHandler from "../model/IDB";


export default class ProfileController {

    constructor() {
        Promise.all([
            this.loadDB(), 
            this.loadProfile(),
            this.loadPlays(),
            this.loadMaps(),
        ]).then(() => {
            window._profilePage.loadUI();
        });
    }


    update(details) {1
        Promise.all([
            this.loadProfile(),
            this.loadPlays(),
            this.loadMaps(),
        ]).then(() => {
            window._profilePage.loadUI();
        });
    }


    async deleteProfile() {
        db.deletePlayerData(this.scoreSaberId);
        window.location.href = "/";
    }


    async loadDB() {
        window.db = new DBHandler();
        db.updatePlayerInfo(this.scoreSaberId, false, (d) => this.update(d));
        db.updatePlayerPlays(this.scoreSaberId, (d) => this.update(d), () => {
            window._profilePage.hidePageLoader();
        });
    }


    async loadProfile() {
        this.profile = await db.getPlayerInfo(this.scoreSaberId);
    }


    async loadPlays() {
        this.plays = await db.getPlays(this.scoreSaberId);
    }


    async loadMaps() {
        this.maps = await db.getMaps();
    }


    async loadTopPlays(callback) {
        await this.loadPlays();
        callback(this.plays.sort((a, b) => new Date(b.timeSet) - new Date(a.timeSet)).sort((a, b) => b.pp - a.pp));
    }


    async loadRecentPlays(callback) {
        await this.loadPlays();
        callback(this.plays.sort((a, b) => new Date(b.timeSet) - new Date(a.timeSet)));
    }


    async getAveragePlayWorth() {
        const plays = await db.getPlays(this.scoreSaberId);
        let total = 0;
        let count = 0;
        for (const play of plays) {
            if (play.playWorth > 0) {
                total += play.playWorth;
                count++;
            }
        }
        return Math.round(total / count);
    }


    get params() {
        return (new URL(document.location)).searchParams;
    }


    get(param) {
        return this.params.get(param);
    }


    get scoreSaberId() {
        return this.get("id");
    }
}
