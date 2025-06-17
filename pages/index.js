// pages/index.js

import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner'; // Assuming this path is correct

const HomePage = () => {
  // Use a league ID that has completed seasons with data
  const hardcodedLeagueId = '1181984921049018368'; // This is your 2024 completed league ID

  const [championsHistory, setChampionsHistory] = useState([]);
  const [standingsBySeason, setStandingsBySeason] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch Champions History
        const championsRes = await fetch(`/api/league-data?leagueId=${hardcodedLeagueId}&dataType=champions`);
        if (!championsRes.ok) {
          throw new Error(`HTTP error! status: ${championsRes.status}`);
        }
        const championsData = await championsRes.json();
        setChampionsHistory(championsData);

        // For each season in the champions history, fetch its standings
        const standingsPromises = championsData.map(async (league) => {
          const standingsRes = await fetch(`/api/league-data?leagueId=${league.league_id}&dataType=standings&season=${league.season}`);
          if (!standingsRes.ok) {
            console.warn(`Could not fetch standings for season ${league.season} (League ID: ${league.league_id}). Status: ${standingsRes.status}`);
            return null; // Return null or handle error for this specific season
          }
          const standingsData = await standingsRes.json();
          return { season: league.season, standings: standingsData.standings, league_name: standingsData.league_name };
        });

        const allStandings = await Promise.all(standingsPromises);
        const validStandings = allStandings.filter(s => s !== null); // Filter out nulls from failed fetches
        const standingsMap = {};
        validStandings.forEach(item => {
          standingsMap[item.season] = item;
        });
        setStandingsBySeason(standingsMap);

      } catch (e) {
        console.error("Error fetching data:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hardcodedLeagueId]); // Depend on hardcodedLeagueId

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-primary text-red-400 p-4">
        <p>Error: {error}. Please check the console for more details.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-textLight p-4 sm:p-6 lg:p-8 font-inter">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-accent mb-8 text-center rounded-lg p-3 bg-cardBg shadow-lg">
          Fantasy Football League History
        </h1>

        {/* Champions History Section */}
        <div className="bg-cardBg p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold text-textLight mb-4 border-b border-secondary pb-2">League Champions</h2>
          {championsHistory.length === 0 ? (
            <p className="text-textLight">No champion history found for this league. Ensure the league ID is correct and has previous seasons.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary rounded-lg overflow-hidden">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-textLight uppercase tracking-wider">Season</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-textLight uppercase tracking-wider">League Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-textLight uppercase tracking-wider">Champion</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-textLight uppercase tracking-wider">Total Rosters</th>
                  </tr>
                </thead>
                <tbody className="bg-cardBg divide-y divide-secondary">
                  {championsHistory.map((entry) => (
                    <tr key={entry.league_id} className="hover:bg-inputBg transition-colors duration-200">
                      <td className="px-4 py-2 whitespace-nowrap text-textLight">{entry.season}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-textLight">{entry.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-textLight">{entry.champion}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-textLight">{entry.total_rosters}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Standings by Season Section */}
        <div className="bg-cardBg p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-textLight mb-4 border-b border-secondary pb-2">Seasonal Standings</h2>
          {Object.keys(standingsBySeason).length === 0 ? (
            <p className="text-textLight">No standings data available for past seasons. Make sure your league has completed seasons with recorded stats.</p>
          ) : (
            <div className="space-y-8">
              {Object.keys(standingsBySeason).sort((a, b) => b - a).map(season => (
                <div key={season} className="border border-secondary rounded-lg p-4">
                  <h3 className="text-xl font-bold text-accent mb-3">Season {season}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary rounded-lg overflow-hidden">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-textLight uppercase tracking-wider">Rank</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-textLight uppercase tracking-wider">Owner</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-textLight uppercase tracking-wider">Wins</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-textLight uppercase tracking-wider">Losses</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-textLight uppercase tracking-wider">Ties</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-textLight uppercase tracking-wider">Total Points</th>
                        </tr>
                      </thead>
                      <tbody className="bg-cardBg divide-y divide-secondary">
                        {standingsBySeason[season].standings.map((team, index) => (
                          <tr key={team.roster_id} className="hover:bg-inputBg transition-colors duration-200">
                            <td className="px-4 py-2 whitespace-nowrap text-textLight">{index + 1}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-textLight">{team.owner}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-textLight">{team.wins}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-textLight">{team.losses}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-textLight">{team.ties}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-textLight">{team.total_points.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
