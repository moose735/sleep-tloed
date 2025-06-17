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
  // Set headers to prevent caching for this API route
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { leagueId, dataType, week, season } = req.query; // Destructure query parameters

  // Base URL for the Sleeper API
  const SLEEPER_API_BASE_URL = 'https://api.sleeper.app/v1';

  // Validate leagueId
  if (!leagueId) {
    console.error("API Error: League ID is required.");
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
        console.log(`Fetching league: ${apiUrl}`);
        const leagueRes = await fetch(apiUrl);
        if (!leagueRes.ok) throw new Error(`Sleeper API error: ${leagueRes.statusText} (Status: ${leagueRes.status})`);
        data = await leagueRes.json();
        console.log(`Fetched league data for ${leagueId}:`, JSON.stringify(data, null, 2));
        break;
      case 'users':
        // Fetch all users (managers) in the league
        apiUrl = `${SLEEPER_API_BASE_URL}/league/${leagueId}/users`;
        console.log(`Fetching users: ${apiUrl}`);
        const usersRes = await fetch(apiUrl);
        if (!usersRes.ok) throw new Error(`Sleeper API error: ${usersRes.statusText} (Status: ${usersRes.status})`);
        data = await usersRes.json();
        console.log(`Fetched users data for ${leagueId}:`, JSON.stringify(data, null, 2));
        break;
      case 'rosters':
        // Fetch all rosters (teams) in the league
        apiUrl = `${SLEEPER_API_BASE_URL}/league/${leagueId}/rosters`;
        console.log(`Fetching rosters: ${apiUrl}`);
        const rostersRes = await fetch(apiUrl);
        if (!rostersRes.ok) throw new Error(`Sleeper API error: ${rostersRes.statusText} (Status: ${rostersRes.status})`);
        data = await rostersRes.json();
        console.log(`Fetched rosters data for ${leagueId}:`, JSON.stringify(data, null, 2));
        break;
      case 'matchups':
        // Fetch matchups for a specific week and season
        if (!week || !season) {
          console.error("API Error: Week and season are required for matchups.");
          return res.status(400).json({ error: 'Week and season are required for matchups.' });
        }
        apiUrl = `${SLEEPER_API_BASE_URL}/league/${leagueId}/matchups/${week}`;
        console.log(`Fetching matchups: ${apiUrl}`);
        const matchupsRes = await fetch(apiUrl);
        if (!matchupsRes.ok) throw new Error(`Sleeper API error: ${matchupsRes.statusText} (Status: ${matchupsRes.status})`);
        data = await matchupsRes.json();
        console.log(`Fetched matchups data for ${leagueId}, week ${week}:`, JSON.stringify(data, null, 2));
        break;
      case 'drafts':
        // Fetch all drafts for a league (for historical draft info)
        apiUrl = `${SLEEPER_API_BASE_URL}/league/${leagueId}/drafts`;
        console.log(`Fetching drafts: ${apiUrl}`);
        const draftsRes = await fetch(apiUrl);
        if (!draftsRes.ok) throw new Error(`Sleeper API error: ${draftsRes.statusText} (Status: ${draftsRes.status})`);
        data = await draftsRes.json();
        console.log(`Fetched drafts data for ${leagueId}:`, JSON.stringify(data, null, 2));
        break;
      case 'standings':
        // This case will trigger an aggregation of league, users, and rosters data
        // to compute standings. This is not a direct Sleeper API call.
        if (!season) {
          console.error("API Error: Season is required for standings.");
          return res.status(400).json({ error: 'Season is required for standings.' });
        }
        console.log(`Aggregating standings for ${leagueId}, season ${season}`);
        data = await fetchStandings(leagueId, season, SLEEPER_API_BASE_URL);
        console.log(`Aggregated standings for ${leagueId}, season ${season}:`, JSON.stringify(data, null, 2));
        break;
      case 'champions':
        // This case aggregates champion data across multiple seasons.
        console.log(`Aggregating champions history for ${leagueId}`);
        data = await fetchLeagueHistory(leagueId, SLEEPER_API_BASE_URL);
        console.log(`Aggregated champions history for ${leagueId}:`, JSON.stringify(data, null, 2));
        break;
      default:
        // Handle unsupported data types
        console.error(`API Error: Invalid data type requested: ${dataType}`);
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
 * @returns {Promise<object>} - A promise that resolves to an object containing season, standings, and league name.
 */
async function fetchStandings(leagueId, season, baseUrl) {
  console.log(`Fetching data for standings aggregation for league ${leagueId}, season ${season}`);
  const [leagueRes, rostersRes, usersRes] = await Promise.all([
    fetch(`${baseUrl}/league/${leagueId}`),
    fetch(`${baseUrl}/league/${leagueId}/rosters`),
    fetch(`${baseUrl}/league/${leagueId}/users`)
  ]);

  if (!leagueRes.ok) throw new Error(`Sleeper API error (league) for standings: ${leagueRes.statusText} (Status: ${leagueRes.status})`);
  if (!rostersRes.ok) throw new Error(`Sleeper API error (rosters) for standings: ${rostersRes.statusText} (Status: ${rostersRes.status})`);
  if (!usersRes.ok) throw new Error(`Sleeper API error (users) for standings: ${usersRes.statusText} (Status: ${usersRes.status})`);

  const league = await leagueRes.json();
  const rosters = await rostersRes.json();
  const users = await usersRes.json();

  console.log(`Raw League data for standings:`, JSON.stringify(league, null, 2));
  console.log(`Raw Rosters data for standings:`, JSON.stringify(rosters, null, 2));
  console.log(`Raw Users data for standings:`, JSON.stringify(users, null, 2));

  const userMap = new Map(users.map(user => [user.user_id, user.display_name || user.username]));

  if (!rosters || rosters.length === 0) {
    console.warn(`No rosters found for league ${leagueId}, season ${season}. Cannot compute standings.`);
    return { season, standings: [], league_name: league.name };
  }

  // Calculate wins, losses, and total points for each roster
  const standings = rosters.map(roster => {
    // Safely access properties with default values
    const wins = roster.settings?.wins ?? 0;
    const losses = roster.settings?.losses ?? 0;
    const ties = roster.settings?.ties ?? 0;
    const fpts = roster.settings?.fpts ?? 0;
    const fpts_decimal = roster.settings?.fpts_decimal ?? 0;

    return {
      roster_id: roster.roster_id,
      owner: userMap.get(roster.owner_id) || 'Unknown Owner',
      wins: wins,
      losses: losses,
      ties: ties,
      total_points: parseFloat(`${fpts}.${fpts_decimal}`), // Combine fpts and fpts_decimal
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
  // IMPORTANT: Add condition to stop if previous_league_id is '0'
  if (!currentLeagueId || currentLeagueId === '0') {
    return history; // Base case: no more previous leagues or invalid ID
  }

  console.log(`Fetching historical data for league ${currentLeagueId}`);

  try {
    // Fetch league details for the current ID
    const leagueRes = await fetch(`${baseUrl}/league/${currentLeagueId}`);
    if (!leagueRes.ok) {
      // Log the error but don't throw, so we can continue with other historical data
      console.error(`Sleeper API error (league history) for ${currentLeagueId}: ${leagueRes.statusText} (Status: ${leagueRes.status})`);
      // If a specific league ID in the chain is Not Found, stop the recursion for this path
      if (leagueRes.status === 404) {
        return history;
      }
      throw new Error(`Sleeper API error: ${leagueRes.statusText} (Status: ${leagueRes.status})`);
    }
    const league = await leagueRes.json();
    console.log(`Raw League data for history (season ${league.season}):`, JSON.stringify(league, null, 2));

    // Fetch rosters for the current league
    const rostersRes = await fetch(`${baseUrl}/league/${currentLeagueId}/rosters`);
    if (!rostersRes.ok) throw new Error(`Sleeper API error (rosters history): ${rostersRes.statusText} (Status: ${rostersRes.status})`);
    const rosters = await rostersRes.json();
    console.log(`Raw Rosters data for history (season ${league.season}):`, JSON.stringify(rosters, null, 2));

    // Fetch users for the current league
    const usersRes = await fetch(`${baseUrl}/league/${currentLeagueId}/users`);
    if (!usersRes.ok) throw new Error(`Sleeper API error (users history): ${usersRes.statusText} (Status: ${usersRes.status})`);
    const users = await usersRes.json();
    console.log(`Raw Users data for history (season ${league.season}):`, JSON.stringify(users, null, 2));

    // Map user IDs to display names
    const userMap = new Map(users.map(user => [user.user_id, user.display_name || user.username]));

    let championOwner = 'Unknown';
    let championRoster = null;
    let maxWins = -1;
    let maxPoints = -1;

    if (rosters && rosters.length > 0) {
        // Find the roster with the most wins, then most points, as a proxy for champion
        rosters.forEach(roster => {
          // Safely access properties with default values
          const wins = roster.settings?.wins ?? 0;
          const fpts = roster.settings?.fpts ?? 0;
          const fpts_decimal = roster.settings?.fpts_decimal ?? 0;
          const totalPoints = parseFloat(`${fpts}.${fpts_decimal}`);

          if (wins > maxWins || (wins === maxWins && totalPoints > maxPoints)) {
            maxWins = wins;
            maxPoints = totalPoints;
            championRoster = roster;
          }
        });

        if (championRoster) {
          championOwner = userMap.get(championRoster.owner_id) || 'Unknown Owner';
        } else {
          console.warn(`No champion roster found based on wins/points for league ${currentLeagueId}, season ${league.season}.`);
        }
    } else {
        console.warn(`No rosters available for league ${currentLeagueId}, season ${league.season}. Cannot determine champion.`);
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
