'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface TeamSummary {
  rank: number
  name: string
  wins: number
  losses: number
  ties: number
  win_percentage: number
  playoff_seed: number
}

interface LeagueSummary {
  teams: TeamSummary[]
  current_week: number
  current_matchup_period: number
}

export default function LeagueRankings({ apiBase }: { apiBase: string }) {
  const [summary, setSummary] = useState<LeagueSummary | null>(null)
  const [weekData, setWeekData] = useState<any>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [weeks, setWeeks] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load league summary
    axios.get(`${apiBase}/league/summary`)
      .then(res => {
        setSummary(res.data)
        setSelectedWeek(res.data.current_matchup_period)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading summary:', err)
        setLoading(false)
      })

    // Load available weeks
    axios.get(`${apiBase}/weeks`)
      .then(res => setWeeks(res.data.weeks))
      .catch(err => console.error('Error loading weeks:', err))
  }, [apiBase])

  useEffect(() => {
    if (selectedWeek) {
      axios.get(`${apiBase}/week/${selectedWeek}`)
        .then(res => setWeekData(res.data))
        .catch(err => console.error('Error loading week data:', err))
    }
  }, [selectedWeek, apiBase])

  if (loading) {
    return <div className="text-center py-8">Loading league data...</div>
  }

  if (!summary) {
    return <div className="text-center py-8 text-red-400">Error loading league data</div>
  }

  // Calculate percentiles for each metric
  const calculatePercentile = (value: number, allValues: number[], reverse: boolean = false) => {
    const sorted = [...allValues].sort((a, b) => reverse ? b - a : a - b)
    const index = sorted.findIndex(v => (reverse ? v <= value : v >= value))
    if (index === -1) return 100
    return Math.round((1 - index / sorted.length) * 100)
  }

  const teamsWithRankings = summary.teams.map(team => {
    const weekTeamData = weekData?.teams?.find((t: any) => t.name === team.name)
    
    const allTeamsBeaten = weekData?.teams?.map((t: any) => t.total_teams_beaten) || []
    const allCategoryWins = weekData?.teams?.map((t: any) => t.total_category_wins) || []
    const allMinutes = weekData?.teams?.map((t: any) => t.minutes_played) || []

    return {
      ...team,
      weekData: weekTeamData,
      teams_beaten_percentile: weekTeamData ? calculatePercentile(weekTeamData.total_teams_beaten, allTeamsBeaten) : null,
      category_wins_percentile: weekTeamData ? calculatePercentile(weekTeamData.total_category_wins, allCategoryWins) : null,
      minutes_percentile: weekTeamData ? calculatePercentile(weekTeamData.minutes_played, allMinutes) : null,
    }
  })

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      {weeks.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <label className="block mb-2">Select Week:</label>
          <select
            value={selectedWeek || ''}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="bg-gray-700 text-white px-4 py-2 rounded"
          >
            {weeks.map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>
      )}

      {/* Rankings Table */}
      <div className="bg-gray-800 rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-4 py-3 text-right">Record</th>
              <th className="px-4 py-3 text-right">Win %</th>
              <th className="px-4 py-3 text-right">Teams Beaten</th>
              <th className="px-4 py-3 text-right">Teams Beaten %ile</th>
              <th className="px-4 py-3 text-right">Category Wins</th>
              <th className="px-4 py-3 text-right">Category Wins %ile</th>
              <th className="px-4 py-3 text-right">Minutes</th>
              <th className="px-4 py-3 text-right">Minutes %ile</th>
            </tr>
          </thead>
          <tbody>
            {teamsWithRankings.map((team, index) => (
              <tr key={team.name} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">{team.rank}</td>
                <td className="px-4 py-3 font-medium">{team.name}</td>
                <td className="px-4 py-3 text-right">{team.wins}-{team.losses}-{team.ties}</td>
                <td className="px-4 py-3 text-right">{team.win_percentage}%</td>
                <td className="px-4 py-3 text-right">{team.weekData?.total_teams_beaten || 'N/A'}</td>
                <td className="px-4 py-3 text-right">
                  {team.teams_beaten_percentile !== null ? `${team.teams_beaten_percentile}%` : 'N/A'}
                </td>
                <td className="px-4 py-3 text-right">{team.weekData?.total_category_wins || 'N/A'}</td>
                <td className="px-4 py-3 text-right">
                  {team.category_wins_percentile !== null ? `${team.category_wins_percentile}%` : 'N/A'}
                </td>
                <td className="px-4 py-3 text-right">
                  {team.weekData?.minutes_played ? team.weekData.minutes_played.toFixed(1) : 'N/A'}
                </td>
                <td className="px-4 py-3 text-right">
                  {team.minutes_percentile !== null ? `${team.minutes_percentile}%` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
