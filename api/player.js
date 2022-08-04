import { APICall, notFound } from './_utils.js';


export default async (request, response) => {

    // Validate the input data
    const id = request.query.id;
    if (!id.match(/^\d+$/)) {
        return notFound(response, 'Invalid ID!');
    }
    
    // Call the API
    new APICall(`https://scoresaber.com/api/player/${id}/full`, response, json => json.id === id).execute();
};