// pages/api/league-data.js

/**
 * API Route for fetching data from the Sleeper API.
 * This acts as a proxy to abstract away the Sleeper API
 * and can be extended for more complex data aggregation.
 *
 * @param {object} req - The incoming request object.
 * @param {object} res - The outgoing response object.
 */
export default async function handler(req, res) {
  const { leagueId, dataType, week, season } = req.query; // Destructure query parameters

  // Base URL for the Sleeper API
  const SLEEPER_API_BASE_URL = 'https://api.sleeper.app/v1';

  // Validate leagueId
  if (!leagueId) {
    return res.status(400).json({ error: 'League ID is required.' });
  }

  let apiUrl = ''; // Initialize API URL
  let data = null; // Initialize data

  try {
    // Determine the API endpoint based on dataType
    switch (dataType) {
      case 'league':
        // Fetch basic league details
        apiUrl = `${SLEEPER_API_BASE_URL}/league/${leagueId}`;
        const leagueRes = await fetch(apiUrl);
        if (!leagueRes.ok) throw new Error(`Sleeper API error: ${leagueRes.statusText}`);
        data = await leagueRes.json();
        break;
      case 'users':
        // Fetch all users (managers) in the league
        apiUrl = `${SLEEPER_API_BASE_URL}/league/${leagueId}/users`;
        const usersRes = await fetch(apiUrl);
        if (!usersRes.ok) throw new Error(`Sleeper API error: ${usersRes.statusText}`);
        data = await usersRes.json();
        break;
      case 'rosters':
        // Fetch all rosters (teams) in the league
        apiUrl = `${SLEEPER_API_BASE_URL}/league/${leagueId}/rosters`;
        const rostersRes = await fetch(apiUrl);
        if (!rostersRes.ok) throw new Error(`Sleeper API error: ${rostersRes.statusText}`);
        data = await rostersRes.json();
        break;
      case 'matchups':
        // Fetch matchups for a specific week and season
        if (!week || !season) {
          return res.status(400).json({ error: 'Week and season are required for matchups.' });
        }
        apiUrl = `${SLEEPER_API_BASE_URL}/league/${leagueId}/matchups/${week}`;
        const matchupsRes = await fetch(apiUrl);
        if (!matchupsRes.ok) throw new Error(`Sleeper API error: ${matchupsRes.statusText}`);
        data = await matchupsRes.json();
        break;
      case 'drafts':
        // Fetch all drafts for a league (for historical draft info)
        apiUrl = `${SLEEPER_API_BASE_URL}/league/${leagueId}/drafts`;
        const draftsRes = await fetch(apiUrl);
        if (!draftsRes.ok) throw new Error(`Sleeper API error: ${draftsRes.statusText}`);
        data = await draftsRes.json();
        break;
      case 'standings':
        // This case will trigger an aggregation of league, users, and rosters data
        // to compute standings. This is not a direct Sleeper API call.
        if (!season) {
          return res.status(400).json({ error: 'Season is required for standings.' });
        }
        data = await fetchStandings(leagueId, season, SLEEPER_API_BASE_URL);
        break;
      case 'champions':
        // This case aggregates champion data across multiple seasons.
        data = await fetchLeagueHistory(leagueId, SLEEPER_API_BASE_URL);
        break;
      default:
        // Handle unsupported data types
        return res.status(400).json({ error: 'Invalid data type requested.' });
    }

    // Send the fetched data back to the client
    res.status(200).json(data);

  } catch (error) {
    // Log and send error response
    console.error(`Error fetching Sleeper data for ${dataType}:`, error);
    res.status(500).json({ error: `Failed to fetch data: ${error.message}` });
  }
}

/**
 * Fetches league data for a specific season and aggregates it to determine standings.
 * This involves multiple Sleeper API calls.
 * @param {string} leagueId - The ID of the current league.
 * @param {string} season - The season to fetch standings for.
 * @param {string} baseUrl - The base URL for the Sleeper API.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of standings.
 */
async function fetchStandings(leagueId, season, baseUrl) {
  // Fetch league, rosters, and users data concurrently
  const [leagueRes, rostersRes, usersRes] = await Promise.all([
    fetch(`${baseUrl}/league/${leagueId}`),
    fetch(`${baseUrl}/league/${leagueId}/rosters`),
    fetch(`${baseUrl}/league/${leagueId}/users`)
  ]);

  // Check if all responses are OK
  if (!leagueRes.ok) throw new Error(`Sleeper API error (league): ${leagueRes.statusText}`);
  if (!rostersRes.ok) throw new Error(`Sleeper API error (rosters): ${rostersRes.statusText}`);
  if (!usersRes.ok) throw new Error(`Sleeper API error (users): ${usersRes.statusText}`);

  // Parse JSON responses
  const league = await leagueRes.json();
  const rosters = await rostersRes.json();
  const users = await usersRes.json();

  const userMap = new Map(users.map(user => [user.user_id, user.display_name || user.username]));
  const rosterMap = new Map(rosters.map(roster => [roster.roster_id, roster]));

  // Calculate wins, losses, and total points for each roster
  const standings = rosters.map(roster => {
    // Ensure wins/losses/ties exist, default to 0 if not present
    const wins = roster.settings?.wins || 0;
    const losses = roster.settings?.losses || 0;
    const ties = roster.settings?.ties || 0;
    const fpts = roster.settings?.fpts || 0;
    const fpts_decimal = roster.settings?.fpts_decimal || 0;

    return {
      roster_id: roster.roster_id,
      owner: userMap.get(roster.owner_id) || 'Unknown Owner',
      wins: wins,
      losses: losses,
      ties: ties,
      total_points: parseFloat(`${fpts}.${fpts_decimal}`), // Combine fpts and fpts_decimal
      // Other relevant roster info can be added here
    };
  });

  // Sort standings by wins (desc), then total points (desc)
  standings.sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return b.total_points - a.total_points;
  });

  return { season, standings, league_name: league.name };
}


/**
 * Recursively fetches league history to determine champions for all available seasons.
 * @param {string} currentLeagueId - The ID of the current league being processed.
 * @param {string} baseUrl - The base URL for the Sleeper API.
 * @param {Array<object>} history - Accumulator for league history data.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of league history, including champions.
 */
async function fetchLeagueHistory(currentLeagueId, baseUrl, history = []) {
  if (!currentLeagueId) {
    return history; // Base case: no more previous leagues
  }

  try {
    // Fetch league details for the current ID
    const leagueRes = await fetch(`${baseUrl}/league/${currentLeagueId}`);
    if (!leagueRes.ok) throw new Error(`Sleeper API error (league history): ${leagueRes.statusText}`);
    const league = await leagueRes.json();

    // Fetch rosters for the current league
    const rostersRes = await fetch(`${baseUrl}/league/${currentLeagueId}/rosters`);
    if (!rostersRes.ok) throw new Error(`Sleeper API error (rosters history): ${rostersRes.statusText}`);
    const rosters = await rostersRes.json();

    // Fetch users for the current league
    const usersRes = await fetch(`${baseUrl}/league/${currentLeagueId}/users`);
    if (!usersRes.ok) throw new Error(`Sleeper API error (users history): ${usersRes.statusText}`);
    const users = await usersRes.json();

    // Map user IDs to display names
    const userMap = new Map(users.map(user => [user.user_id, user.display_name || user.username]));

    let championOwner = 'Unknown';
    // The champion is usually the roster with a win_total of 1 in playoffs, or max wins if playoffs not explicitly tracked in API
    // Sleeper API's league settings often have 'playoff_start_week' and 'championship_week'
    // To identify a champion, we look for the roster with the 'last_played_week' (or similar logic)
    // and a 'rank' of 1 in the standings, or simply the most wins if no explicit champion field.
    // For simplicity, we'll assume the champion is the roster with `rank: 1` if available or the one with the most wins and a high score.
    // However, the Sleeper API doesn't directly give 'champion' status for past leagues.
    // We'll rely on the `roster.settings.wins` and `roster.settings.championships` (if present, though rare for historical via API)
    // For now, we'll try to find the team with the most wins and best playoff standing if available,
    // or simply mark the team with the highest `roster.settings.fpts` if `previous_league_id` exists.

    // A more robust way to find champions is often to check if a roster has `playoff_wins > 0`
    // or by looking at the playoff bracket (which would require more calls).
    // Example endpoint for playoff bracket: `GET /v1/league/<league_id>/winners_bracket`
    // This is more complex, so for simplicity, we'll rely on `rosters` data for now.

    let championRoster = null;
    let maxWins = -1;
    let maxPoints = -1;

    // Find the roster with the most wins, then most points, as a proxy for champion
    rosters.forEach(roster => {
      const wins = roster.settings?.wins || 0;
      const fpts = parseFloat(`${roster.settings?.fpts || 0}.${roster.settings?.fpts_decimal || 0}`);

      if (wins > maxWins || (wins === maxWins && fpts > maxPoints)) {
        maxWins = wins;
        maxPoints = fpts;
        championRoster = roster;
      }
    });

    if (championRoster) {
      championOwner = userMap.get(championRoster.owner_id) || 'Unknown Owner';
    }

    // Add current league's champion and season to history
    history.push({
      season: league.season,
      league_id: league.league_id,
      name: league.name,
      champion: championOwner,
      total_rosters: league.total_rosters,
    });

    // Recursively call for the previous league if it exists
    if (league.previous_league_id) {
      return fetchLeagueHistory(league.previous_league_id, baseUrl, history);
    } else {
      // Sort history by season in descending order (most recent first)
      history.sort((a, b) => b.season - a.season);
      return history;
    }
  } catch (error) {
    console.error(`Error fetching historical league data for ${currentLeagueId}:`, error);
    // If an error occurs for a previous league, we still return the history collected so far.
    // Sort history by season in descending order (most recent first) before returning.
    history.sort((a, b) => b.season - a.season);
    return history;
  }
}
