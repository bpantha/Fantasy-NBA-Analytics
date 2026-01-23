'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import WeekModal from './WeekModal'
import OpponentDetailModal from './OpponentDetailModal'

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
  category_totals?: Record<string, number>  // PTS, REB, AST, etc.
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
  week_start_date?: string
  week_end_date?: string
  league_avg_minutes: number
  teams: Team[]
}

interface RosterTotalsTeam {
  name: string
  team_id: number
  logo_url?: string | null
  roster_totals: Record<string, number>
  archetype?: string
  punt_cats?: string[]
}

interface TeamName {
  name: string
  team_id: number
}

export default function TeamVsLeague({ apiBase }: { apiBase: string }) {
  const { data: weeksData } = useSWR<{ weeks: number[] }>(`${apiBase}/weeks`)
  const { data: summary } = useSWR<{ current_matchup_period: number; teams?: { name: string; team_id: number }[] }>(`${apiBase}/league/summary`)

  const weeks = (weeksData?.weeks ?? []).sort((a: number, b: number) => a - b)
  const currentWeek = summary?.current_matchup_period ?? null
  const teamNames: TeamName[] = (summary?.teams ?? []).map((t) => ({ name: t.name, team_id: t.team_id }))

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [allWeeksData, setAllWeeksData] = useState<Record<number, WeekData>>({})
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState<Array<{ week: number; teamsBeaten: number }>>([])
  const [opponentMinutes, setOpponentMinutes] = useState<Record<string, { minutes: number; vsAvg: number; week: number }>>({})
  const [compareTeam, setCompareTeam] = useState<string>('')
  const [showWeekModal, setShowWeekModal] = useState(false)
  const [weekForModal, setWeekForModal] = useState<number | null>(null)
  const [showOpponentModal, setShowOpponentModal] = useState(false)

  // Set default selectedWeek when weeks load
  useEffect(() => {
    if (weeks.length > 0 && selectedWeek == null) {
      setSelectedWeek(Math.max(...weeks))
    }
  }, [weeks, selectedWeek])

  // Roster totals (SWR caches; only fetch when a team is selected)
  const { data: rosterTotals, isLoading: loadingRosterTotals } = useSWR<{ teams: RosterTotalsTeam[]; season?: number }>(
    selectedTeam ? `${apiBase}/league/roster-totals` : null
  )

  // Selected week data (SWR caches; live=true only for current week)
  const weekKey = selectedTeam && selectedWeek
    ? `${apiBase}/week/${selectedWeek}${selectedWeek === currentWeek ? '?live=true' : ''}`
    : null
  const { data: weekData, mutate: mutateWeek, isLoading: loadingWeek } = useSWR<WeekData>(weekKey)

  // Merge SWR week into allWeeksData when it’s available
  useEffect(() => {
    if (weekData && selectedWeek != null) {
      setAllWeeksData((prev) => ({ ...prev, [selectedWeek]: weekData }))
    }
  }, [weekData, selectedWeek])

  // Load historical weeks when team/week selected (HTTP cache helps repeat visits)
  useEffect(() => {
    if (!selectedTeam || !selectedWeek || weeks.length === 0) {
      setAllWeeksData({})
      return
    }

    let cancelled = false
    const historicalWeeks = weeks.filter((w) => w !== selectedWeek)

    const load = async () => {
      setLoading(true)
      try {
        const results = await Promise.all(
          historicalWeeks.map(async (week) => {
            try {
              const res = await axios.get(`${apiBase}/week/${week}`)
              return { week, data: res.data as WeekData }
            } catch (err) {
              console.error(`Error loading historical week ${week}:`, err)
              return null
            }
          })
        )
        if (cancelled) return
        const merged: Record<number, WeekData> = {}
        for (const r of results) {
          if (r) merged[r.week] = r.data
        }
        setAllWeeksData((prev) => ({ ...prev, ...merged }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedTeam, selectedWeek, apiBase, weeks])

  const refreshCurrentWeek = () => {
    if (currentWeek != null && selectedWeek === currentWeek && selectedTeam) {
      mutateWeek()
    }
  }

  // Calculate minutes vs each opponent from historical data
  useEffect(() => {
    if (selectedTeam && Object.keys(allWeeksData).length > 0) {
      const minutesMap: Record<string, { minutes: number; vsAvg: number; week: number }> = {}
      
      for (const [weekNum, weekData] of Object.entries(allWeeksData)) {
        const team = weekData.teams.find(t => t.name === selectedTeam)
        if (team && team.opponent_name) {
          const opponent = team.opponent_name
          if (!minutesMap[opponent] || parseInt(weekNum) > minutesMap[opponent].week) {
            const weekAvg = weekData.league_avg_minutes || 0
            const teamMinutes = team.minutes_played || 0
            minutesMap[opponent] = {
              minutes: teamMinutes,
              vsAvg: teamMinutes - weekAvg,
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
    if (selectedTeam && weeks.length > 0 && Object.keys(allWeeksData).length > 0) {
      const data = weeks.map(week => {
        const weekData = allWeeksData[week]
        if (!weekData) return { week, teamsBeaten: 0 }
        
        const team = weekData.teams.find(t => t.name === selectedTeam)
        if (!team) return { week, teamsBeaten: 0 }
        
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
      setWeekForModal(week)
      setShowWeekModal(true)
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

  const teamsBeaten = calculateTeamsBeaten(selectedTeamData)
  const bestCategory = findBestCategory(selectedTeamData)

  const categories = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']
  const selectedRoster = rosterTotals?.teams?.find(t => t.name === selectedTeam)
  const compareRoster = compareTeam ? rosterTotals?.teams?.find(t => t.name === compareTeam) : null
  const isBetter = (cat: string, a: number, b: number) =>
    cat === 'TO' ? (a < b) : (a > b)

  return (
    <div className="space-y-6">
      {/* Week and Team Selectors */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-start sm:items-end">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 flex-1 w-full sm:w-auto">
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
              disabled={!teamNames || teamNames.length === 0}
            >
              <option value="">-- Select a team --</option>
              {teamNames.map(team => (
                <option key={team.team_id} value={team.name}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedWeek === currentWeek && selectedTeam && (
          <button
            onClick={refreshCurrentWeek}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
            title="Refresh current week data"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      {/* Show blank state if no team selected */}
      {!selectedTeam && (
        <div className="bg-gray-800 p-12 rounded-lg text-center">
          <p className="text-gray-400 text-lg">Please select a team to view data</p>
        </div>
      )}

      {/* Loading State */}
      {(loading || loadingWeek) && selectedTeam && (
        <div className="bg-gray-800 p-8 md:p-12 rounded-lg flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
          <p className="text-lg md:text-xl font-semibold text-gray-300">Loading data for {selectedTeam}...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait while we fetch the latest information</p>
        </div>
      )}

      {/* Content - only show if team selected and data loaded */}
      {selectedTeam && !loading && !loadingWeek && weekData && selectedTeamData && (
        <>
          {/* Bar Graph */}
          {graphData.length > 0 && (
            <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
              <h2 className="text-lg md:text-xl font-bold mb-4">📊 Teams Beaten Over Time - {selectedTeam}</h2>
              <ResponsiveContainer width="100%" height={250} className="min-h-[250px]">
                <BarChart data={graphData} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="week" 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => `W${value}`}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: any) => [`Teams Beaten: ${value}`, '']}
                    labelFormatter={(label: any) => `Week ${label}`}
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

          {/* Team Roster Category Totals + Compare */}
          <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg md:text-xl font-bold">
                📊 Team Roster Category Totals — {selectedTeam}
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400 whitespace-nowrap">Compare with:</label>
                <select
                  value={compareTeam}
                  onChange={(e) => setCompareTeam(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded text-sm min-w-[160px]"
                >
                  <option value="">— None —</option>
                  {rosterTotals?.teams
                    ?.filter(t => t.name !== selectedTeam)
                    .map(t => (
                      <option key={t.team_id} value={t.name}>{t.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-400 mb-4">
              Sum of each player&apos;s season average (e.g. 20 ppg + 21 ppg = 41 PTS). Compare highlights green when you&apos;re better, red when worse (for TO, lower is better).
            </p>
            {(selectedRoster?.archetype || (compareTeam && compareRoster?.archetype)) && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {selectedRoster?.archetype && (
                  <span className="px-2 py-1 bg-purple-700/50 text-purple-200 rounded text-sm" title={selectedRoster?.punt_cats?.length ? `Weak: ${selectedRoster.punt_cats.join(', ')}` : undefined}>
                    <strong>{selectedTeam}</strong>: {selectedRoster.archetype}
                  </span>
                )}
                {compareTeam && compareRoster?.archetype && (
                  <span className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-sm" title={compareRoster?.punt_cats?.length ? `Weak: ${compareRoster.punt_cats.join(', ')}` : undefined}>
                    <strong>{compareTeam}</strong>: {compareRoster.archetype}
                  </span>
                )}
              </div>
            )}
            {loadingRosterTotals && (
              <div className="flex items-center gap-2 text-gray-400 py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-500 border-t-transparent" />
                Loading roster totals…
              </div>
            )}
            {!loadingRosterTotals && selectedRoster && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm md:text-base">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left">Category</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-right">{selectedTeam}</th>
                      {compareTeam && compareRoster && (
                        <>
                          <th className="px-2 md:px-4 py-2 md:py-3 text-right">{compareTeam}</th>
                          <th className="px-2 md:px-4 py-2 md:py-3 text-center">vs</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => {
                      const my = selectedRoster?.roster_totals?.[cat] ?? 0
                      const other = compareRoster?.roster_totals?.[cat] ?? 0
                      const showPct = cat === 'FG%' || cat === 'FT%'
                      const fmt = (v: number) => showPct ? `${(v * 100).toFixed(1)}%` : (typeof v === 'number' ? v.toFixed(1) : String(v))
                      const better = compareRoster ? isBetter(cat, my, other) : null
                      return (
                        <tr key={cat} className="border-t border-gray-700">
                          <td className="px-2 md:px-4 py-2 md:py-3 font-medium">{cat}</td>
                          <td className={`px-2 md:px-4 py-2 md:py-3 text-right ${compareRoster && better === true ? 'text-green-400' : compareRoster && better === false ? 'text-red-400' : ''}`}>
                            {fmt(my)}
                          </td>
                          {compareTeam && compareRoster && (
                            <>
                              <td className={`px-2 md:px-4 py-2 md:py-3 text-right ${better === false ? 'text-green-400' : better === true ? 'text-red-400' : ''}`}>
                                {fmt(other)}
                              </td>
                              <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                                {better === true ? (
                                  <span className="text-green-400" title="You’re better">✓</span>
                                ) : better === false ? (
                                  <span className="text-red-400" title="They’re better">✗</span>
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingRosterTotals && !selectedRoster && rosterTotals && (
              <p className="text-gray-400">Roster totals not found for this team.</p>
            )}
            {!loadingRosterTotals && selectedTeam && !rosterTotals && (
              <p className="text-amber-400">Roster totals unavailable. The league API may be required.</p>
            )}
          </div>

          {/* Selected Team Performance */}
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
                  <h3 className="text-xs md:text-sm font-semibold text-purple-200 mb-2">⭐ Best Category</h3>
                  <p className="text-xl md:text-2xl font-bold">{bestCategory.category}</p>
                  {selectedTeamData.category_totals && selectedTeamData.category_totals[bestCategory.category] !== undefined && (
                    <p className="text-lg md:text-xl font-bold mt-1">
                      {bestCategory.category === 'FG%' || bestCategory.category === 'FT%' 
                        ? `${(selectedTeamData.category_totals[bestCategory.category] * 100).toFixed(1)}%`
                        : selectedTeamData.category_totals[bestCategory.category].toFixed(1)}
                    </p>
                  )}
                  <p className="text-xs md:text-sm text-purple-200 mt-1">{bestCategory.wins} wins</p>
                </div>
              )}
            </div>

            {/* Opponent Matchup */}
            {selectedTeamData.opponent_name && (
              <div
                className="bg-gray-800 p-4 md:p-6 rounded-lg cursor-pointer hover:bg-gray-700/80 transition-colors"
                onClick={() => setShowOpponentModal(true)}
                role="button"
              >
                <h3 className="text-lg md:text-xl font-bold mb-4">⚔️ vs {selectedTeamData.opponent_name}</h3>
                {selectedTeamData.matchup_details[selectedTeamData.opponent_name] && (
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    <div className="text-center">
                      <p className="text-2xl md:text-3xl font-bold text-green-400">
                        {selectedTeamData.matchup_details[selectedTeamData.opponent_name].won}
                      </p>
                      <p className="text-xs md:text-sm text-gray-400">✅ Categories Won</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl md:text-3xl font-bold text-red-400">
                        {selectedTeamData.matchup_details[selectedTeamData.opponent_name].lost}
                      </p>
                      <p className="text-xs md:text-sm text-gray-400">❌ Categories Lost</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl md:text-3xl font-bold text-gray-400">
                        {selectedTeamData.matchup_details[selectedTeamData.opponent_name].tied}
                      </p>
                      <p className="text-xs md:text-sm text-gray-400">🤝 Tied</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-blue-400 mt-2">👆 Click for category breakdown</p>
              </div>
            )}

            {/* Performance vs All Teams */}
            <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
              <h3 className="text-lg md:text-xl font-bold mb-4">📊 Performance vs All Teams</h3>
              <div className="space-y-4">
                {Object.entries(selectedTeamData.matchup_details).map(([opponent, details]) => {
                  const opponentTeamData = weekData?.teams.find(t => t.name === opponent)
                  const opponentMinutes = opponentTeamData?.minutes_played || 0
                  const weekAvg = weekData?.league_avg_minutes || 0
                  const opponentVsAvg = opponentMinutes - weekAvg
                  
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
                      
                      {selectedWeek && weekData && opponentTeamData && (
                        <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-2 md:p-3 rounded-lg mb-2">
                          <h5 className="text-xs font-semibold text-orange-200 mb-1">⏱️ {opponent}'s Minutes Played</h5>
                          <p className="text-xl md:text-2xl font-bold">{opponentMinutes.toFixed(0)}</p>
                          <p className="text-xs text-orange-200 mt-1">
                            {opponentVsAvg > 0 ? '+' : ''}{opponentVsAvg.toFixed(1)} vs Week {selectedWeek} League Avg Minutes
                          </p>
                        </div>
                      )}
                      
                      {details.won_cats.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs md:text-sm text-gray-400 mb-1">✅ Categories Won:</p>
                          <div className="flex flex-wrap gap-1 md:gap-2">
                            {details.won_cats.map(cat => {
                              const selectedValue = selectedTeamData.category_totals?.[cat]
                              const opponentValue = opponentTeamData?.category_totals?.[cat]
                              return (
                                <span key={cat} className="px-1.5 md:px-2 py-0.5 md:py-1 bg-green-700 rounded text-xs md:text-sm" title={
                                  selectedValue !== undefined && opponentValue !== undefined
                                    ? `${selectedTeam}: ${cat === 'FG%' || cat === 'FT%' ? (selectedValue * 100).toFixed(1) + '%' : selectedValue.toFixed(1)} vs ${opponent}: ${cat === 'FG%' || cat === 'FT%' ? (opponentValue * 100).toFixed(1) + '%' : opponentValue.toFixed(1)}`
                                    : cat
                                }>
                                  {cat} {selectedValue !== undefined && opponentValue !== undefined && (
                                    <span className="text-green-200">
                                      ({cat === 'FG%' || cat === 'FT%' ? (selectedValue * 100).toFixed(1) : selectedValue.toFixed(1)} vs {cat === 'FG%' || cat === 'FT%' ? (opponentValue * 100).toFixed(1) : opponentValue.toFixed(1)})
                                    </span>
                                  )}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {details.lost_cats.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs md:text-sm text-gray-400 mb-1">❌ Categories Lost:</p>
                          <div className="flex flex-wrap gap-1 md:gap-2">
                            {details.lost_cats.map(cat => {
                              const selectedValue = selectedTeamData.category_totals?.[cat]
                              const opponentValue = opponentTeamData?.category_totals?.[cat]
                              return (
                                <span key={cat} className="px-1.5 md:px-2 py-0.5 md:py-1 bg-red-700 rounded text-xs md:text-sm" title={
                                  selectedValue !== undefined && opponentValue !== undefined
                                    ? `${selectedTeam}: ${cat === 'FG%' || cat === 'FT%' ? (selectedValue * 100).toFixed(1) + '%' : selectedValue.toFixed(1)} vs ${opponent}: ${cat === 'FG%' || cat === 'FT%' ? (opponentValue * 100).toFixed(1) + '%' : opponentValue.toFixed(1)}`
                                    : cat
                                }>
                                  {cat} {selectedValue !== undefined && opponentValue !== undefined && (
                                    <span className="text-red-200">
                                      ({cat === 'FG%' || cat === 'FT%' ? (selectedValue * 100).toFixed(1) : selectedValue.toFixed(1)} vs {cat === 'FG%' || cat === 'FT%' ? (opponentValue * 100).toFixed(1) : opponentValue.toFixed(1)})
                                    </span>
                                  )}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {showWeekModal && weekForModal != null && (
        <WeekModal
          week={weekForModal}
          apiBase={apiBase}
          onClose={() => { setShowWeekModal(false); setWeekForModal(null); }}
        />
      )}

      {showOpponentModal && selectedTeamData?.opponent_name && selectedTeamData.matchup_details[selectedTeamData.opponent_name] && weekData && (
        <OpponentDetailModal
          teamName={selectedTeam}
          opponentName={selectedTeamData.opponent_name}
          matchupDetails={selectedTeamData.matchup_details[selectedTeamData.opponent_name]}
          teamCategoryTotals={selectedTeamData.category_totals ?? {}}
          opponentCategoryTotals={weekData.teams.find(t => t.name === selectedTeamData.opponent_name)?.category_totals ?? {}}
          onClose={() => setShowOpponentModal(false)}
        />
      )}
    </div>
  )
}
