'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface Team {
  name: string
  team_id: number
  total_teams_beaten: number
  total_category_wins: number
  minutes_played: number
  minutes_vs_opponent: number
  opponent_name: string
  minutes_vs_league_avg: number
  league_avg_minutes: number
  beaten_teams: string[]
  matchup_details: Record<string, {
    won: number
    lost: number
    tied: number
    won_cats: string[]
    lost_cats: string[]
  }>
}

interface WeekData {
  matchup_period: number
  export_date: string
  league_avg_minutes: number
  teams: Team[]
}

interface LeaderboardEntry {
  team_name: string
  total_wins: number
  teams_beaten: string[]
}

export default function TeamVsLeague({ apiBase }: { apiBase: string }) {
  const [weeks, setWeeks] = useState<number[]>([])
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [allWeeksData, setAllWeeksData] = useState<Record<number, WeekData>>({})
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState<Array<{ week: number; teamsBeaten: number }>>([])
  const [opponentMinutes, setOpponentMinutes] = useState<Record<string, { minutes: number; vsAvg: number; week: number }>>({})

  // Load all available weeks
  useEffect(() => {
    axios.get(`${apiBase}/weeks`)
      .then(res => {
        const availableWeeks = res.data.weeks.sort((a: number, b: number) => a - b)
        setWeeks(availableWeeks)
        if (availableWeeks.length > 0) {
          setSelectedWeek(Math.max(...availableWeeks))
        }
      })
      .catch(err => console.error('Error loading weeks:', err))
  }, [apiBase])

  // Load data for all weeks
  useEffect(() => {
    if (weeks.length > 0) {
      const loadAllWeeks = async () => {
        const weeksData: Record<number, WeekData> = {}
        for (const week of weeks) {
          try {
            const res = await axios.get(`${apiBase}/week/${week}`)
            weeksData[week] = res.data
          } catch (err) {
            console.error(`Error loading week ${week}:`, err)
          }
        }
        setAllWeeksData(weeksData)
      }
      loadAllWeeks()
    }
  }, [weeks, apiBase])

  // Update selected week data
  useEffect(() => {
    if (selectedWeek && allWeeksData[selectedWeek]) {
      setWeekData(allWeeksData[selectedWeek])
      if (allWeeksData[selectedWeek].teams.length > 0 && !selectedTeam) {
        setSelectedTeam(allWeeksData[selectedWeek].teams[0].name)
      }
    }
  }, [selectedWeek, allWeeksData, selectedTeam])

  // Calculate minutes vs each opponent
  useEffect(() => {
    if (selectedTeam && Object.keys(allWeeksData).length > 0) {
      const minutesMap: Record<string, { minutes: number; vsAvg: number; week: number }> = {}
      
      // Look through all weeks to find when this team played each opponent
      for (const [weekNum, weekData] of Object.entries(allWeeksData)) {
        const team = weekData.teams.find(t => t.name === selectedTeam)
        if (team && team.opponent_name) {
          const opponent = team.opponent_name
          if (!minutesMap[opponent] || parseInt(weekNum) > minutesMap[opponent].week) {
            // Use the most recent week if team played opponent multiple times
            // Calculate vs that week's average
            const weekAvg = weekData.league_avg_minutes || 0
            minutesMap[opponent] = {
              minutes: team.minutes_played || 0,
              vsAvg: (team.minutes_played || 0) - weekAvg,
              week: parseInt(weekNum)
            }
          }
        }
      }
      
      setOpponentMinutes(minutesMap)
    }
  }, [selectedTeam, allWeeksData])

  // Update graph data when team or weeks change
  useEffect(() => {
    if (selectedTeam && weeks.length > 0) {
      const data = weeks.map(week => {
        const weekData = allWeeksData[week]
        if (!weekData) return { week, teamsBeaten: 0 }
        
        const team = weekData.teams.find(t => t.name === selectedTeam)
        if (!team) return { week, teamsBeaten: 0 }
        
        // Calculate teams beaten (5-4-0 or better)
        let teamsBeaten = 0
        for (const [opponent, details] of Object.entries(team.matchup_details)) {
          if (details.won >= 5) {
            teamsBeaten++
          }
        }
        
        return { week, teamsBeaten }
      })
      setGraphData(data)
    }
  }, [selectedTeam, weeks, allWeeksData])

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const week = data.activePayload[0].payload.week
      setSelectedWeek(week)
    }
  }

  const selectedTeamData = weekData?.teams.find(t => t.name === selectedTeam)
  
  // Calculate teams beaten for selected team (5-4-0 or better)
  const calculateTeamsBeaten = (team: Team | undefined): number => {
    if (!team) return 0
    let count = 0
    for (const [opponent, details] of Object.entries(team.matchup_details)) {
      if (details.won >= 5) {
        count++
      }
    }
    return count
  }

  // Find best category won
  const findBestCategory = (team: Team | undefined): { category: string; wins: number } | null => {
    if (!team) return null
    
    const categoryWins: Record<string, number> = {}
    for (const [opponent, details] of Object.entries(team.matchup_details)) {
      for (const cat of details.won_cats) {
        categoryWins[cat] = (categoryWins[cat] || 0) + 1
      }
    }
    
    let bestCategory = ''
    let maxWins = 0
    for (const [cat, wins] of Object.entries(categoryWins)) {
      if (wins > maxWins) {
        maxWins = wins
        bestCategory = cat
      }
    }
    
    return bestCategory ? { category: bestCategory, wins: maxWins } : null
  }

  // Generate weekly leaderboard
  const generateLeaderboard = (): LeaderboardEntry[] => {
    if (!weekData) return []
    
    const leaderboard: Record<string, { wins: number; teams: string[] }> = {}
    
    for (const team of weekData.teams) {
      let wins = 0
      const beaten: string[] = []
      
      for (const [opponent, details] of Object.entries(team.matchup_details)) {
        if (details.won >= 5) {
          wins++
          beaten.push(opponent)
        }
      }
      
      leaderboard[team.name] = { wins, teams: beaten }
    }
    
    return Object.entries(leaderboard)
      .map(([team_name, data]) => ({
        team_name,
        total_wins: data.wins,
        teams_beaten: data.teams
      }))
      .sort((a, b) => b.total_wins - a.total_wins)
  }

  const teamsBeaten = calculateTeamsBeaten(selectedTeamData)
  const bestCategory = findBestCategory(selectedTeamData)
  const leaderboard = generateLeaderboard()

  const teams = weekData?.teams || []

  return (
    <div className="space-y-6">
      {/* Week and Team Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <label className="block mb-2 font-semibold">Select Week:</label>
          <select
            value={selectedWeek || ''}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded"
          >
            {weeks.map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <label className="block mb-2 font-semibold">Select Team:</label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded"
          >
            {teams.map(team => (
              <option key={team.team_id} value={team.name}>{team.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bar Graph */}
      {graphData.length > 0 && (
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
          <h2 className="text-lg md:text-xl font-bold mb-4">Teams Beaten Over Time - {selectedTeam}</h2>
          <ResponsiveContainer width="100%" height={250} className="min-h-[250px]">
            <BarChart data={graphData} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="week" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
              <Bar dataKey="teamsBeaten" fill="#3B82F6" name="Teams Beaten">
                {graphData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.week === selectedWeek ? '#10B981' : '#3B82F6'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-400 mt-2">Click on a bar to view that week's details</p>
        </div>
      )}

      {/* Weekly Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
          <h2 className="text-lg md:text-xl font-bold mb-4">Week {selectedWeek} Leaderboard</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left">Rank</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left">Team</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right">Total Wins</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right">Minutes</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right">vs Week Avg</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => {
                  const teamData = weekData?.teams.find(t => t.name === entry.team_name)
                  const minutes = teamData?.minutes_played || 0
                  const vsAvg = teamData && weekData ? (teamData.minutes_played - weekData.league_avg_minutes) : 0
                  return (
                    <tr 
                      key={entry.team_name} 
                      className="border-t border-gray-700 hover:bg-gray-750 cursor-pointer"
                      onClick={() => setSelectedTeam(entry.team_name)}
                    >
                      <td className="px-2 md:px-4 py-2 md:py-3">{index + 1}</td>
                      <td className="px-2 md:px-4 py-2 md:py-3 font-medium text-blue-400 hover:text-blue-300">
                        {entry.team_name}
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">{entry.total_wins}</td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">{minutes.toFixed(0)}</td>
                      <td className={`px-2 md:px-4 py-2 md:py-3 text-right ${vsAvg > 0 ? 'text-green-400' : vsAvg < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {vsAvg > 0 ? '+' : ''}{vsAvg.toFixed(1)} vs Week {selectedWeek} Avg
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 p-3 bg-gray-700 rounded-lg">
            <p className="text-xs md:text-sm text-gray-300">
              <span className="font-semibold">Week {selectedWeek} League Average:</span> {weekData?.league_avg_minutes.toFixed(1)} minutes
            </p>
          </div>
          <p className="text-xs md:text-sm text-gray-400 mt-2">Click on a team name to view their details</p>
        </div>
      )}

      {/* Selected Team Performance */}
      {selectedTeamData && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 md:p-6 rounded-lg">
              <h3 className="text-xs md:text-sm font-semibold text-blue-200 mb-2">Teams Beaten</h3>
              <p className="text-3xl md:text-4xl font-bold">{teamsBeaten}</p>
              <p className="text-xs md:text-sm text-blue-200 mt-1">5-4-0 or better</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-600 to-green-800 p-4 md:p-6 rounded-lg">
              <h3 className="text-xs md:text-sm font-semibold text-green-200 mb-2">Total Category Wins</h3>
              <p className="text-3xl md:text-4xl font-bold">{selectedTeamData.total_category_wins}</p>
              <p className="text-xs md:text-sm text-green-200 mt-1">Across all matchups</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-4 md:p-6 rounded-lg">
              <h3 className="text-xs md:text-sm font-semibold text-orange-200 mb-2">Minutes Played</h3>
              <p className="text-2xl md:text-3xl font-bold">{selectedTeamData.minutes_played.toFixed(0)}</p>
              <p className="text-xs md:text-sm text-orange-200 mt-1">
                {selectedTeamData.minutes_vs_league_avg > 0 ? '+' : ''}
                {selectedTeamData.minutes_vs_league_avg.toFixed(1)} vs Week {selectedWeek} Avg
              </p>
              {weekData && (
                <p className="text-xs text-orange-200/80 mt-1">Week {selectedWeek} League Avg: {weekData.league_avg_minutes.toFixed(1)} min</p>
              )}
            </div>
            
            {bestCategory && (
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-4 md:p-6 rounded-lg">
                <h3 className="text-xs md:text-sm font-semibold text-purple-200 mb-2">Best Category</h3>
                <p className="text-xl md:text-2xl font-bold">{bestCategory.category}</p>
                <p className="text-xs md:text-sm text-purple-200 mt-1">{bestCategory.wins} wins</p>
              </div>
            )}
          </div>

          {/* Opponent Matchup */}
          {selectedTeamData.opponent_name && (
            <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
              <h3 className="text-lg md:text-xl font-bold mb-4">vs {selectedTeamData.opponent_name}</h3>
              {selectedTeamData.matchup_details[selectedTeamData.opponent_name] && (
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-bold text-green-400">
                      {selectedTeamData.matchup_details[selectedTeamData.opponent_name].won}
                    </p>
                    <p className="text-xs md:text-sm text-gray-400">Categories Won</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-bold text-red-400">
                      {selectedTeamData.matchup_details[selectedTeamData.opponent_name].lost}
                    </p>
                    <p className="text-xs md:text-sm text-gray-400">Categories Lost</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-bold text-gray-400">
                      {selectedTeamData.matchup_details[selectedTeamData.opponent_name].tied}
                    </p>
                    <p className="text-xs md:text-sm text-gray-400">Tied</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Performance vs All Teams */}
          <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
            <h3 className="text-lg md:text-xl font-bold mb-4">Performance vs All Teams</h3>
            <div className="space-y-4">
              {Object.entries(selectedTeamData.matchup_details).map(([opponent, details]) => {
                const oppMinutes = opponentMinutes[opponent]
                return (
                  <div key={opponent} className="border border-gray-700 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                      <h4 className="font-semibold text-sm md:text-base">{opponent}</h4>
                      <span className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${
                        details.won >= 5 
                          ? 'bg-green-600 text-white' 
                          : details.won > details.lost 
                          ? 'bg-yellow-600 text-white' 
                          : 'bg-red-600 text-white'
                      }`}>
                        {details.won}-{details.lost}-{details.tied}
                      </span>
                    </div>
                    
                    {/* Minutes Played vs Opponent */}
                    {oppMinutes && (
                      <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-3 md:p-4 rounded-lg mb-3">
                        <h5 className="text-xs md:text-sm font-semibold text-orange-200 mb-1">Minutes Played</h5>
                        <p className="text-2xl md:text-3xl font-bold">{oppMinutes.minutes.toFixed(0)}</p>
                        <p className="text-xs md:text-sm text-orange-200 mt-1">
                          {oppMinutes.vsAvg > 0 ? '+' : ''}{oppMinutes.vsAvg.toFixed(1)} vs Week {oppMinutes.week} Avg
                        </p>
                      </div>
                    )}
                    
                    {details.won_cats.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs md:text-sm text-gray-400 mb-1">Categories Won:</p>
                        <div className="flex flex-wrap gap-1 md:gap-2">
                          {details.won_cats.map(cat => (
                            <span key={cat} className="px-1.5 md:px-2 py-0.5 md:py-1 bg-green-700 rounded text-xs md:text-sm">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {details.lost_cats.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs md:text-sm text-gray-400 mb-1">Categories Lost:</p>
                        <div className="flex flex-wrap gap-1 md:gap-2">
                          {details.lost_cats.map(cat => (
                            <span key={cat} className="px-1.5 md:px-2 py-0.5 md:py-1 bg-red-700 rounded text-xs md:text-sm">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
