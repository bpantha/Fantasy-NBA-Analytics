'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

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
  matchup_details: Record<string, any>
}

interface WeekData {
  matchup_period: number
  teams: Team[]
}

export default function TeamComparison({ apiBase }: { apiBase: string }) {
  const [weeks, setWeeks] = useState<number[]>([])
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [team1, setTeam1] = useState<string>('')
  const [team2, setTeam2] = useState<string>('')
  const [comparison, setComparison] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load available weeks
    axios.get(`${apiBase}/weeks`)
      .then(res => {
        const availableWeeks = res.data.weeks
        setWeeks(availableWeeks)
        if (availableWeeks.length > 0) {
          setSelectedWeek(Math.max(...availableWeeks))
        }
      })
      .catch(err => console.error('Error loading weeks:', err))
  }, [apiBase])

  useEffect(() => {
    if (selectedWeek) {
      axios.get(`${apiBase}/week/${selectedWeek}`)
        .then(res => {
          setWeekData(res.data)
          if (res.data.teams && res.data.teams.length >= 2) {
            setTeam1(res.data.teams[0].name)
            setTeam2(res.data.teams[1].name)
          }
        })
        .catch(err => console.error('Error loading week data:', err))
    }
  }, [selectedWeek, apiBase])

  useEffect(() => {
    if (team1 && team2 && apiBase) {
      setLoading(true)
      axios.get(`${apiBase}/compare/${encodeURIComponent(team1)}/${encodeURIComponent(team2)}`)
        .then(res => {
          setComparison(res.data)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error comparing teams:', err)
          setLoading(false)
        })
    }
  }, [team1, team2, apiBase])

  const teams = weekData?.teams || []

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <label className="block mb-2">Select Week:</label>
        <select
          value={selectedWeek || ''}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          className="bg-gray-700 text-white px-4 py-2 rounded w-full md:w-auto"
        >
          {weeks.map(week => (
            <option key={week} value={week}>Week {week}</option>
          ))}
        </select>
      </div>

      {/* Team Selectors */}
      {teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="block mb-2">Team 1:</label>
            <select
              value={team1}
              onChange={(e) => setTeam1(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded"
            >
              {teams.map(team => (
                <option key={team.team_id} value={team.name}>{team.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="block mb-2">Team 2:</label>
            <select
              value={team2}
              onChange={(e) => setTeam2(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded"
            >
              {teams.map(team => (
                <option key={team.team_id} value={team.name}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {loading && <div className="text-center py-8">Loading comparison...</div>}
      
      {comparison && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team 1 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">{comparison.team1.name}</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Category Wins Ranking</h3>
                <p>Teams Beaten: {comparison.team1.total_teams_beaten}</p>
                <p>Total Category Wins: {comparison.team1.total_category_wins}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Minutes Played</h3>
                <p>Total: {comparison.team1.minutes_played.toFixed(1)} min</p>
                <p>vs {comparison.team1.opponent_name}: {comparison.team1.minutes_vs_opponent?.toFixed(1) || 'N/A'} min</p>
                <p>vs League Avg: {comparison.team1.minutes_vs_league_avg > 0 ? '+' : ''}{comparison.team1.minutes_vs_league_avg.toFixed(1)} min</p>
              </div>

              {Object.keys(comparison.team1.matchup_details || {}).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Matchup Details</h3>
                  {Object.entries(comparison.team1.matchup_details).slice(0, 3).map(([opponent, details]: [string, any]) => (
                    <div key={opponent} className="mb-2 text-sm">
                      <p className="font-medium">{opponent}: {details.won}-{details.lost}</p>
                      {details.won_cats.length > 0 && (
                        <p className="text-gray-400">Won: {details.won_cats.join(', ')}</p>
                      )}
                      {details.lost_cats.length > 0 && (
                        <p className="text-gray-400">Lost: {details.lost_cats.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Team 2 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">{comparison.team2.name}</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Category Wins Ranking</h3>
                <p>Teams Beaten: {comparison.team2.total_teams_beaten}</p>
                <p>Total Category Wins: {comparison.team2.total_category_wins}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Minutes Played</h3>
                <p>Total: {comparison.team2.minutes_played.toFixed(1)} min</p>
                <p>vs {comparison.team2.opponent_name}: {comparison.team2.minutes_vs_opponent?.toFixed(1) || 'N/A'} min</p>
                <p>vs League Avg: {comparison.team2.minutes_vs_league_avg > 0 ? '+' : ''}{comparison.team2.minutes_vs_league_avg.toFixed(1)} min</p>
              </div>

              {Object.keys(comparison.team2.matchup_details || {}).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Matchup Details</h3>
                  {Object.entries(comparison.team2.matchup_details).slice(0, 3).map(([opponent, details]: [string, any]) => (
                    <div key={opponent} className="mb-2 text-sm">
                      <p className="font-medium">{opponent}: {details.won}-{details.lost}</p>
                      {details.won_cats.length > 0 && (
                        <p className="text-gray-400">Won: {details.won_cats.join(', ')}</p>
                      )}
                      {details.lost_cats.length > 0 && (
                        <p className="text-gray-400">Lost: {details.lost_cats.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
