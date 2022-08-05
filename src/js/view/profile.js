import ProfileController from "../controller/profile";


export default class ProfilePage {


    constructor() {
        window.FIRST_LOAD = true;

        this._topPlaysBtn = document.getElementById("top-plays-btn");
        this._recentPlaysBtn = document.getElementById("recent-plays-btn");
        this._topPlaysSection = document.getElementById("top-plays-section");
        this._recentPlaysSection = document.getElementById("recent-plays-section");
        this._topPlaysTable = document.getElementById("top-plays-table");
        this._recentPlaysTable = document.getElementById("recent-plays-table");
        this._progressElement = document.getElementById("progress");
        this._progressLabel = document.getElementById("progress-label");
        this._deleteProfileBtn = document.getElementById("forget-my-profile-btn");
        this._profileName = document.getElementById("profile-name");
        this._profileImage = document.getElementById("profile-img");
        this._profilePP = document.getElementById("profile-pp");
        this._pageLoader = document.getElementById("page-loader");
        this._headerContainer = document.getElementById("profile-header-container");

        this.showPageLoader();

        this.controller = new ProfileController();

        this.switchToRecentPlays();
        this.connectEvents();
    }


    connectEvents() {
        this._topPlaysBtn.addEventListener("click", () => {
            this.switchToTopPlays();
        });

        this._recentPlaysBtn.addEventListener("click", () => {
            this.switchToRecentPlays();
        });

        this._deleteProfileBtn.addEventListener("click", () => {
            this.areYouSure();
        });
    }


    switchToTopPlays() {
        this._topPlaysBtn.classList.add("active");
        this._recentPlaysBtn.classList.remove("active");
        this.controller.loadTopPlays((data) => {
            this._recentPlaysSection.classList.add("hidden");
            this._topPlaysTable.innerHTML = "";

            const rankedData = data.filter(play => {
                const map = this.controller.maps.find(map => map.leaderboardId === play.leaderboardId);
                return map != null && map.ranked;
            })

            for (const play of rankedData) {
                const map = this.controller.maps.find(map => map.leaderboardId === play.leaderboardId);
                const rowElement = document.createElement("tr");
                rowElement.innerHTML = `
                    <th scope="row">
                        <img src="${map.coverImage}" alt="" width="40">
                    </th>
                    <td>${play.rank}</th>
                    <td>${map.songName}</td>
                    <td>${map.stars} <i class="fa-solid fa-star"></i></td>
                    <td>${play.accuracy}%</td>
                    <td>${play.pp}</td>
                    <td>Nothing</td>
                `;
                this._topPlaysTable.appendChild(rowElement);
            }

            this._topPlaysSection.classList.remove("hidden");
        });
    }


    switchToRecentPlays() {
        this._topPlaysBtn.classList.remove("active");
        this._recentPlaysBtn.classList.add("active");
        this.controller.loadRecentPlays((data) => {
            this._topPlaysSection.classList.add("hidden");
            this._recentPlaysTable.innerHTML = "";

            const rankedData = data.filter(play => {
                const map = this.controller.maps.find(map => map.leaderboardId === play.leaderboardId);
                return map != null && map.ranked;
            })

            for (const play of rankedData) {
                const map = this.controller.maps.find(map => map.leaderboardId === play.leaderboardId);
                const rowElement = document.createElement("tr");
                rowElement.innerHTML = `
                    <th scope="row">
                        <img src="${map.coverImage}" alt="" width="40">
                    </th>
                    <td>${play.rank}</th>
                    <td>${map.songName}</td>
                    <td>${map.stars} <i class="fa-solid fa-star"></i></td>
                    <td>${play.accuracy}%</td>
                    <td>${play.pp}</td>
                    <td>Nothing</td>
                `;
                this._recentPlaysTable.appendChild(rowElement);
            }

            this._recentPlaysSection.classList.remove("hidden");
        });
    }


    hideProgress() {
        this._progressElement.classList.add("hidden");
        this._progressLabel.classList.add("hidden");
    }


    setProgress(progress) {
        this._progressElement.classList.remove("hidden");
        this._progressLabel.classList.remove("hidden");
        this._progressElement.setAttribute("value", progress);
        this._progressLabel.innerHTML = `${Math.floor(progress * 10) / 10}% <br> Loading your scoresaber profile... <br>(takes a few minutes based on your play count)`;
    }

    areYouSure() {
        const confirm = window.confirm("This will delete all your cached scores, but will allow you to reload everything if something isn't working. Are you sure?");
        if (confirm) {
            this.controller.deleteProfile();
        }
    }


    loadUI() {
        const profile = this.controller.profile;
        if (profile == null) {
            return;
        }

        // Load profile
        this._profileName.innerText = profile.name;
        this._profileImage.src = profile.profilePicture;
        this._profilePP.innerText = profile.pp + "pp";
        this._headerContainer.classList.remove("hidden");

        // Load scores
        if (this._topPlaysBtn.classList.contains("active")) {
            this.switchToTopPlays();
        } else {
            this.switchToRecentPlays();
        }
    }


    showPageLoader() {
        if (!window.FIRST_LOAD) {
            this._pageLoader.indeterminate = true;
            this._pageLoader.classList.remove("hidden");
        }
    }


    hidePageLoader() {
        this._pageLoader.indeterminate = true;
        this._pageLoader.classList.add("hidden");
    }

}
