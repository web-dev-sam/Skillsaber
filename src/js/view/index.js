import MainController from "../controller/index";


export default class MainPage {


    constructor() {
        this._startButton = document.getElementById("start-btn");
        this._scoresaberURLInput = document.getElementById("ss-profile");
        this.controller = new MainController();

        this.connectEvents();
    }


    connectEvents() {
        this._startButton.addEventListener("click", () => {
            this.onStart();
        });
    }


    async onStart() {
        const valid = await this.validateInputData();
        if (!valid) {
            return;
        }

        this.controller.redirectToProfile();
    }


    async validateInputData() {
        this.startButtonLoading();
        this.setInputState(this._scoresaberURLInput, "");

        const ssURL = this._scoresaberURLInput.value.trim();
        const validSSURL = await MainController.isValidScoresaberURL(ssURL);
        let valid = true;

        if (!validSSURL) {
            this.setInputState(this._scoresaberURLInput, "error");
            valid = false;
        }

        this.controller.useScoreSaberURL(ssURL);
        this.endButtonLoading();

        return valid;
    }

    startButtonLoading() {
        this._startButton.setAttribute("aria-busy", "true");
        this._startButton.innerHTML = "Here we go...";
    }


    endButtonLoading() {
        this._startButton.removeAttribute("aria-busy");
        this._startButton.innerHTML = "Lets see!";
    }


    setInputState(input, state) {
        switch (state) {
            case "error":
                input.setAttribute("aria-invalid", "true");
                break;
            case "valid":
                input.setAttribute("aria-invalid", "false");
                break;
            default:
                input.removeAttribute("aria-invalid");
        }
    }
}
