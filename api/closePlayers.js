import { APICall, notFound } from './_utils.js';


export default async (request, response) => {

    // Validate the input data
    const leaderboard = request.query.leaderboard;
    const rank = request.query.rank;
    if (!rank.match(/^\d+$/) || !leaderboard.match(/^\d+$/)) {
        return notFound(response, 'Invalid args!');
    }
    
    const minRank = Math.max(+rank - 6, 1);
    const maxRank = minRank === 1 ? +rank + rank : +rank + 6;
    const minPage = Math.floor(minRank / 12) + 1;
    const maxPage = Math.floor(maxRank / 12) + 1;

    // Call the API
    const jsonmin = await new APICall(`https://scoresaber.com/api/leaderboard/by-id/${leaderboard}/scores?page=${minPage}`, response, json => json.scores).dryExecute();
    if (minPage === maxPage) {
        return response.status(200).json(
            jsonmin.scores.filter(score => score.rank >= minRank && score.rank <= maxRank)
        );
    } else {
        const jsonmax = await new APICall(`https://scoresaber.com/api/leaderboard/by-id/${leaderboard}/scores?page=${maxPage}`, response, json => json.scores).dryExecute();
        return response.status(200).json(
            jsonmin.scores.concat(jsonmax.scores.filter(score => score.rank >= minRank && score.rank <= maxRank))
        );
    }
};