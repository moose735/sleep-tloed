// pages/index.js

import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * HomePage Component
 * This is the main page for the fantasy football league history site.
 * It now displays history and statistics for a specific, pre-configured league.
 */
const HomePage = () => {
  // Hardcode your specific Sleeper League ID here
  // IMPORTANT: Replace 'YOUR_LEAGUE_ID_HERE' with your actual League ID.
  const hardcodedLeagueId = '1181984921049018368'; // Example: '9876543210'

  const [currentLeagueId, setCurrentLeagueId] = useState(hardcodedLeagueId);
  const [leagueData, setLeagueData] = useState(null);
  const [leagueUsers, setLeagueUsers] = useState([]);
  const [leagueRosters, setLeagueRosters] = useState([]); // Keep track of rosters if needed for other UI elements
  const [leagueHistory, setLeagueHistory] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedStandings, setSelectedStandings] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // General success/info messages

  /**
   * Fetches data from our Next.js API route.
   * @param {string} dataType - The type of data to fetch (e.g., 'league', 'users', 'rosters', 'champions', 'standings').
   * @param {object} params - Additional query parameters like leagueId, week, season.
   * @returns {Promise<object|null>} - The fetched data or null if an error occurs.
   */
  const fetchData = useCallback(async (dataType, params = {}) => {
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      // Ensure the hardcodedLeagueId is used for API calls
      const queryString = new URLSearchParams({ leagueId: hardcodedLeagueId, dataType, ...params }).toString();
      const response = await fetch(`/api/league-data?${queryString}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data from API.');
      }
      return data;
    } catch (err) {
      console.error(`Error fetching ${dataType}:`, err);
      setError(`Error fetching ${dataType}: ${err.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [hardcodedLeagueId]); // Depend on hardcodedLeagueId

  /**
   * Main effect to fetch all necessary league data when the component mounts or hardcodedLeagueId changes.
   */
  useEffect(() => {
    const getAllLeagueData = async () => {
      if (!currentLeagueId || currentLeagueId === 'YOUR_LEAGUE_ID_HERE') {
        setLeagueData(null);
        setLeagueUsers([]);
        setLeagueRosters([]);
        setLeagueHistory([]);
        setSelectedStandings(null);
        setError('Please set your league ID in the code (pages/index.js).');
        return;
      }

      setIsLoading(true);
      setError('');
      setMessage('Fetching league data...');

      try {
        // Fetch basic league details, users, and rosters concurrently
        const [league, users, rosters] = await Promise.all([
          fetchData('league'),
          fetchData('users'),
          fetchData('rosters') // Fetch rosters here as it's needed for standings/champions
        ]);

        if (league) {
          setLeagueData(league);
          setLeagueUsers(users || []);
          setLeagueRosters(rosters || []); // Store rosters
          setMessage(`Successfully loaded data for ${league.name} (${league.season} season).`);

          // Fetch historical champions based on the current league (which might have a previous_league_id)
          const history = await fetchData('champions', { leagueId: currentLeagueId });
          setLeagueHistory(history || []);

          // Set the current season as the default selected season for standings
          // If no history, default to current league's season
          setSelectedSeason(league.season);

        } else {
          setError('Could not find league data. Please ensure the hardcoded League ID is correct.');
          setLeagueData(null);
          setLeagueUsers([]);
          setLeagueRosters([]);
          setLeagueHistory([]);
          setSelectedStandings(null);
        }
      } catch (err) {
        setError(`Failed to load all league data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    getAllLeagueData();
  }, [currentLeagueId, fetchData]); // Only run on mount and if currentLeagueId changes

  /**
   * Effect to fetch standings when selectedSeason or currentLeagueId changes.
   */
  useEffect(() => {
    const getStandingsForSeason = async () => {
      if (currentLeagueId && selectedSeason) {
        setMessage(`Fetching standings for ${selectedSeason}...`);
        const standingsData = await fetchData('standings', { leagueId: currentLeagueId, season: selectedSeason });
        if (standingsData) {
          setSelectedStandings(standingsData);
          setMessage(`Standings loaded for ${selectedSeason}.`);
        } else {
          setSelectedStandings(null);
          // Error message already set by fetchData
        }
      }
    };
    getStandingsForSeason();
  }, [selectedSeason, currentLeagueId, fetchData]);


  return (
    <div className="min-h-screen bg-primary flex flex-col items-center py-8 px-4 font-inter">
      <header className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl font-bold text-accent mb-4">Fantasy Football League History</h1>
        <p className="text-lg text-textLight">
          Explore the history and statistics of your specific fantasy football league.
        </p>
      </header>

      <main className="w-full max-w-4xl bg-cardBg rounded-lg shadow-xl p-6 mb-8">
        {/* The input field has been removed as the league ID is now hardcoded */}

        {/* Loading and Error Messages */}
        {isLoading && <LoadingSpinner />}
        {error && (
          <div className="bg-red-600 text-white p-3 rounded-md mb-4 text-center">
            {error}
          </div>
        )}
        {message && !error && (
          <div className="bg-green-600 text-white p-3 rounded-md mb-4 text-center">
            {message}
          </div>
        )}

        {/* Display League Overview */}
        {leagueData && !isLoading && !error ? (
          <section className="mb-8 p-4 bg-secondary rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-accent mb-3">League Overview: {leagueData.name}</h2>
            <p className="text-textLight mb-1">Current Season: <span className="font-medium">{leagueData.season}</span></p>
            <p className="text-textLight mb-1">Total Rosters: <span className="font-medium">{leagueData.total_rosters}</span></p>
            {leagueData.previous_league_id && (
              <p className="text-textLight">Previous League ID: <span className="font-medium">{leagueData.previous_league_id}</span></p>
            )}
            {/* Display message if users or rosters data is unexpectedly empty */}
            {leagueUsers.length === 0 && <p className="text-sm text-yellow-400 mt-2">Warning: No user data found for this league. Team names may not display correctly.</p>}
            {leagueRosters.length === 0 && <p className="text-sm text-yellow-400 mt-2">Warning: No roster data found for this league. Standings and champions may not be available.</p>}
          </section>
        ) : !isLoading && !error && (
            <p className="text-textLight text-center py-4">Enter your League ID to view history and stats.</p>
        )}


        {/* Display League History (Champions) */}
        {leagueHistory.length > 0 && !isLoading && !error ? (
          <section className="mb-8 p-4 bg-secondary rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-accent mb-3">League Champions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-inputBg rounded-lg overflow-hidden">
                <thead className="bg-gray-700 text-textLight">
                  <tr>
                    <th className="px-4 py-2 text-left">Season</th>
                    <th className="px-4 py-2 text-left">League Name</th>
                    <th className="px-4 py-2 text-left">Champion</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueHistory.map((entry) => (
                    <tr key={entry.league_id} className="border-b border-gray-600 last:border-b-0 hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-4 py-2">{entry.season}</td>
                      <td className="px-4 py-2">{entry.name}</td>
                      <td className="px-4 py-2 font-medium">{entry.champion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              (Champion determined by highest wins/points in the last known season data through the Sleeper API.)
            </p>
          </section>
        ) : leagueData && !isLoading && !error && (
            <p className="text-textLight text-center py-4">No historical champion data available for this league.</p>
        )}

        {/* Display Standings for Selected Season */}
        {selectedStandings && selectedStandings.standings && selectedStandings.standings.length > 0 && !isLoading && !error ? (
          <section className="p-4 bg-secondary rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-accent mb-3">League Standings</h2>
            <div className="mb-4">
              <label htmlFor="season-select" className="block text-textLight mb-2">Select Season:</label>
              <select
                id="season-select"
                className="p-2 rounded-md bg-inputBg text-textLight border border-gray-600 focus:ring-2 focus:ring-accent focus:border-transparent"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
              >
                {/* Generate options from league history, ensuring unique years */}
                {[...new Set(leagueHistory.map(entry => entry.season))]
                  .sort((a, b) => b - a) // Sort seasons descending
                  .map(season => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-inputBg rounded-lg overflow-hidden">
                <thead className="bg-gray-700 text-textLight">
                  <tr>
                    <th className="px-4 py-2 text-left">Rank</th>
                    <th className="px-4 py-2 text-left">Team Owner</th>
                    <th className="px-4 py-2 text-left">Wins</th>
                    <th className="px-4 py-2 text-left">Losses</th>
                    <th className="px-4 py-2 text-left">Ties</th>
                    <th className="px-4 py-2 text-left">Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStandings.standings.map((team, index) => (
                    <tr key={team.roster_id} className="border-b border-gray-600 last:border-b-0 hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2 font-medium">{team.owner}</td>
                      <td className="px-4 py-2">{team.wins}</td>
                      <td className="px-4 py-2">{team.losses}</td>
                      <td className="px-4 py-2">{team.ties}</td>
                      <td className="px-4 py-2">{team.total_points.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : leagueData && !isLoading && !error && (
            <p className="text-textLight text-center py-4">No standings data available for the selected season or league.</p>
        )}
      </main>

      <footer className="w-full max-w-4xl text-center mt-8 text-gray-400 text-sm">
        <p>Powered by Next.js, React, Tailwind CSS, and the Sleeper API.</p>
      </footer>
    </div>
  );
};

export default HomePage;
