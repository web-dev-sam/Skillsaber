import { APICall, notFound } from './_utils.js';


export default async (request, response) => {
    const id = request.query.id;
    const page = request.query.page;
    const sort = request.query.sortmode;
    const sortmodes = ["recent", "top"];
    console.log("Plays", id, page, sort);

    // Validate the input data
    if (!id.match(/^\d+$/) || !page.match(/^\d+$/) || !sortmodes.includes(sort)) {
        return notFound(response, 'Invalid ID!');
    }
    
    // Call the API
    new APICall(`https://scoresaber.com/api/player/${id}/scores?page=${page}&sort=${sort}`, response, json => json.metadata != null).execute();
};