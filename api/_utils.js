import fetch from 'node-fetch';

export class APICall {

    constructor(url, response, isValid) {
        this.url = url;
        this.responded = false;
        this.isValidResponse = isValid;
        this.response = response;
    }


    respond(code, message) {
        if (this.responded) return;
        
        this.responded = true;
        this.response.status(code).json({
            errorMessage: message
        });
    }


    success(data) {
        if (this.responded) return;

        this.responded = true;
        this.response.status(200).json(data);
    }


    async execute() {
        fetch(this.url)
            .then(res => {
                if (res.status !== 200) this.respond(400, 'API Error!');
                else return res.json();
            })
            .then(json => {
                if (json != null && this.isValidResponse(json))
                    this.success(json);
                else this.respond(400, 'API error!');
            })
            .catch(err => {
                this.respond(500, err.message);
            });
    }
}

export function notFound(response, message) {
    response.status(400).json({
        errorMessage: message
    });
}