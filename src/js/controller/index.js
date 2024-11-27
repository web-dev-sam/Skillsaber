

export default class MainController {


    redirectToProfile() {
        window.location.href = `/profile.html?id=${this.scoreSaberId}`;
    }


    useScoreSaberURL(url) {
        const numbers = url.match(/\/\d+/g);
        const userID = numbers[0].substring(1);
        this.scoreSaberId = userID;
    }


    static async isValidScoresaberURL(url) {
        if (!url.startsWith("https://scoresaber.com/u/")) {
            return false;
        }

        const numbers = url.match(/\/\d+/g);
        const userID = numbers[0].substring(1);
        const fetchurl = `/api/player?id=${userID}`;

        const response = await fetch(fetchurl);
        return response.status === 200;
    }

}
