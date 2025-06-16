// pages/index.js

import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * HomePage Component
 * This is the main page for the fantasy football league history site.
 * It allows users to input a Sleeper League ID and displays
 * the league's history, standings, and other relevant information.
 */
const HomePage = () => {
  // State variables for league ID, fetched data, loading status, and errors
  const [leagueIdInput, setLeagueIdInput] = useState('');
  const [currentLeagueId, setCurrentLeagueId] = useState('');
  const [leagueData, setLeagueData] = useState(null);
  const [leagueUsers, setLeagueUsers] = useState([]);
  const [leagueRosters, setLeagueRosters] = useState([]);
  const [leagueHistory, setLeagueHistory] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedStandings, setSelectedStandings] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // General success/info messages

  // Debounce input to prevent excessive API calls while typing
  useEffect(() => {
    const handler = setTimeout(() => {
      // Only set currentLeagueId if the input has changed and is not empty
      if (leagueIdInput && leagueIdInput !== currentLeagueId) {
        setCurrentLeagueId(leagueIdInput);
      }
    }, 500); // 500ms debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [leagueIdInput, currentLeagueId]);

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
      const queryString = new URLSearchParams({ leagueId: currentLeagueId, dataType, ...params }).toString();
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
  }, [currentLeagueId]);

  /**
   * Main effect to fetch all necessary league data when currentLeagueId changes.
   */
  useEffect(() => {
    const getAllLeagueData = async () => {
      if (!currentLeagueId) {
        setLeagueData(null);
        setLeagueUsers([]);
        setLeagueRosters([]);
        setLeagueHistory([]);
        setSelectedStandings(null);
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
          fetchData('rosters')
        ]);

        if (league) {
          setLeagueData(league);
          setLeagueUsers(users || []);
          setLeagueRosters(rosters || []);
          setMessage(`Successfully loaded data for ${league.name} (${league.season} season).`);

          // Fetch historical champions based on the current league (which might have a previous_league_id)
          const history = await fetchData('champions', { leagueId: currentLeagueId });
          setLeagueHistory(history || []);

          // Set the current season as the default selected season for standings
          setSelectedSeason(league.season);

        } else {
          setError('Could not find league data. Please check the League ID.');
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
  }, [currentLeagueId, fetchData]);

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
          Enter your Sleeper League ID to explore its history and statistics.
        </p>
      </header>

      <main className="w-full max-w-4xl bg-cardBg rounded-lg shadow-xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <input
            type="text"
            className="flex-grow p-3 rounded-md bg-inputBg text-textLight placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 ease-in-out"
            placeholder="Enter Sleeper League ID (e.g., 1234567890)"
            value={leagueIdInput}
            onChange={(e) => setLeagueIdInput(e.target.value)}
          />
          {/* No explicit button needed due to debounced input change triggering fetch */}
        </div>

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
        {leagueData && !isLoading && !error && (
          <section className="mb-8 p-4 bg-secondary rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-accent mb-3">League Overview: {leagueData.name}</h2>
            <p className="text-textLight mb-1">Current Season: <span className="font-medium">{leagueData.season}</span></p>
            <p className="text-textLight mb-1">Total Rosters: <span className="font-medium">{leagueData.total_rosters}</span></p>
            {leagueData.previous_league_id && (
              <p className="text-textLight">Previous League ID: <span className="font-medium">{leagueData.previous_league_id}</span></p>
            )}
          </section>
        )}

        {/* Display League History (Champions) */}
        {leagueHistory.length > 0 && !isLoading && !error && (
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
        )}

        {/* Display Standings for Selected Season */}
        {leagueData && leagueUsers.length > 0 && leagueRosters.length > 0 && !isLoading && !error && (
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

            {selectedStandings && selectedStandings.standings && selectedStandings.standings.length > 0 ? (
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
            ) : (
              <p className="text-textLight text-center py-4">No standings data available for this season or league.</p>
            )}
          </section>
        )}
      </main>

      <footer className="w-full max-w-4xl text-center mt-8 text-gray-400 text-sm">
        <p>Powered by Next.js, React, Tailwind CSS, and the Sleeper API.</p>
      </footer>
    </div>
  );
};

export default HomePage;
