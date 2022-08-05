
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


    update(details) {
        if (details != null && window.FIRST_LOAD) {
            window._profilePage.setProgress(details.progress * 100 / details.total);
        }

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
        db.updatePlayerInfo(this.scoreSaberId, (d) => this.update(d));
        db.updatePlayerPlays(this.scoreSaberId, (d) => this.update(d), () => {
            window._profilePage.hideProgress();
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


    get params() {
        return (new URL(document.location)).searchParams;
    }


    get(param) {
        return this.params.get(param);
    }


    get scoreSaberId() {
        return this.get("id");
    }


    get beatSaberCategory() {
        return this.get("category");
    }
}
