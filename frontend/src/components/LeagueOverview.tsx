'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import TeamModal from './TeamModal'
import WeekModal from './WeekModal'
import CategoryComparisonModal from './CategoryComparisonModal'
import ImprovementComparisonModal from './ImprovementComparisonModal'

interface LeagueStats {
  overall_performance: {
    total_wins_leader: any
    win_pct_leader: any
    most_dominant: any
    most_consistent: any
  }
  category_performance: {
    category_leaders: Record<string, { team: string; wins: number }>
    most_balanced: string | null
  }
  activity_metrics: {
    most_active: any
    minutes_leader: any
    efficiency_leader: any
  }
  streaks_trends: {
    current_streak_leaders: Array<{ name: string; streak: number }>
    longest_streak_leaders: Array<{ name: string; streak: number }>
    hot_teams: Array<{ name: string; avg: number }>
    cold_teams: Array<{ name: string; avg: number }>
  }
  head_to_head: {
    best_matchups?: Array<{
      team: string
      opponent: string
      wins: number
      total: number
      win_rate: number
    }>
    worst_matchups?: Array<{
      team: string
      opponent: string
      wins: number
      total: number
      win_rate: number
    }>
    category_specialists?: Record<string, {
      team: string
      win_rate: number
    }>
    most_consistent_weekly?: Array<{
      name: string
      variance: number
      avg: number
    }>
    least_consistent_weekly?: Array<{
      name: string
      variance: number
      avg: number
    }>
  }
  weekly_performance: {
    best_single_week: any
    most_improved: {
      name: string
      improvement: number
      early_avg: number
      recent_avg: number
      description?: string
    } | null
  }
  teams_list?: Array<{
    name: string
    total_wins: number
    win_percentage: number
    avg_teams_beaten: number
    variance: number
    total_teams_beaten: number
    total_minutes: number
    efficiency: number
    logo_url?: string
  }>
}

interface CurrentWeekTeam {
  name: string
  matchup_details: Record<string, {
    won: number
    lost: number
    tied: number
    won_cats: string[]
    lost_cats: string[]
  }>
  beaten_teams: string[]
  category_totals: Record<string, number>
  logo_url?: string
}

interface CurrentWeekData {
  matchup_period: number
  teams: CurrentWeekTeam[]
}

export default function LeagueOverview({ apiBase }: { apiBase: string }) {
  const [stats, setStats] = useState<LeagueStats | null>(null)
  const [currentWeekData, setCurrentWeekData] = useState<CurrentWeekData | null>(null)
  const [currentWeek, setCurrentWeek] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingCurrentWeek, setLoadingCurrentWeek] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showImprovementModal, setShowImprovementModal] = useState(false)
  const [sortField, setSortField] = useState<'avg_teams_beaten' | 'total_wins' | 'win_percentage'>('avg_teams_beaten')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Load league stats
  useEffect(() => {
    axios.get(`${apiBase}/league/stats`)
      .then(res => {
        setStats(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading league stats:', err)
        setLoading(false)
      })
  }, [apiBase])

  // Get current week and load current week data
  useEffect(() => {
    axios.get(`${apiBase}/league/summary`)
      .then(res => {
        const week = res.data.current_matchup_period
        setCurrentWeek(week)
        
        // Load current week data with live=true
        setLoadingCurrentWeek(true)
        axios.get(`${apiBase}/week/${week}`, { params: { live: 'true' } })
          .then(weekRes => {
            setCurrentWeekData(weekRes.data)
            setLoadingCurrentWeek(false)
          })
          .catch(err => {
            console.error('Error loading current week data:', err)
            setLoadingCurrentWeek(false)
          })
      })
      .catch(err => {
        console.error('Error loading current week:', err)
      })
  }, [apiBase])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading league statistics...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-20 text-red-400">
        Error loading league statistics. Please try again later.
      </div>
    )
  }

  const categories = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']
  const categoryEmojis: Record<string, string> = {
    'PTS': '🏀',
    'REB': '📊',
    'AST': '🎯',
    'STL': '👋',
    'BLK': '🛡️',
    'FG%': '🎨',
    'FT%': '🎪',
    '3PM': '💫',
    'TO': '⚠️'
  }

  const handleSort = (field: 'avg_teams_beaten' | 'total_wins' | 'win_percentage') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedTeams = stats.teams_list ? [...stats.teams_list].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  }) : []

  // Calculate current week category dominators and team stats
  const currentWeekCategoryDominators: Record<string, { team: string; value: number }> = {}
  const currentWeekTeamStats: Array<{
    team: string
    opponents_beaten: string[]
    best_category: string
    logo_url?: string
  }> = []

  if (currentWeekData && currentWeekData.teams) {
    // Find category dominators (teams with highest value in each category, except TO where lower is better)
    categories.forEach(cat => {
      let bestValue = cat === 'TO' ? Infinity : -Infinity
      let dominatorTeam = ''
      
      currentWeekData.teams.forEach(team => {
        const value = team.category_totals?.[cat] || 0
        
        if (cat === 'TO') {
          // For TO, lower is better (fewer turnovers)
          if (value > 0 && value < bestValue) {
            bestValue = value
            dominatorTeam = team.name
          }
        } else {
          // For other categories, higher is better
          if (value > bestValue) {
            bestValue = value
            dominatorTeam = team.name
          }
        }
      })
      
      if (dominatorTeam) {
        currentWeekCategoryDominators[cat] = {
          team: dominatorTeam,
          value: bestValue
        }
      }
    })

    // Calculate opponents beaten and best category for each team
    currentWeekData.teams.forEach(team => {
      // Get opponents beaten (teams they're winning 5+ categories against)
      const opponentsBeaten = team.beaten_teams || []
      
      // Find best category (category they win most often)
      const categoryWinCounts: Record<string, number> = {}
      Object.values(team.matchup_details || {}).forEach(details => {
        details.won_cats?.forEach((cat: string) => {
          categoryWinCounts[cat] = (categoryWinCounts[cat] || 0) + 1
        })
      })
      
      let bestCategory = ''
      let maxWins = 0
      Object.entries(categoryWinCounts).forEach(([cat, wins]) => {
        if (wins > maxWins) {
          maxWins = wins
          bestCategory = cat
        }
      })
      
      currentWeekTeamStats.push({
        team: team.name,
        opponents_beaten: opponentsBeaten,
        best_category: bestCategory || 'N/A',
        logo_url: team.logo_url
      })
    })
  }

  return (
    <div className="space-y-6">
      {/* Current Week Category Dominators KPIs */}
      {currentWeekData && currentWeek && (
        <section className="bg-gray-800 p-3 md:p-6 rounded-lg">
          <h2 className="text-xl md:text-2xl font-bold mb-4">🏆 Week {currentWeek} Category Dominators</h2>
          {loadingCurrentWeek ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Loading current week data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {categories.map(cat => {
                const dominator = currentWeekCategoryDominators[cat]
                if (!dominator) return null
                
                const emoji = categoryEmojis[cat] || '📊'
                const displayValue = cat === 'FG%' || cat === 'FT%' 
                  ? `${(dominator.value * 100).toFixed(1)}%`
                  : cat === 'TO'
                  ? dominator.value.toFixed(0)  // TO is a whole number
                  : dominator.value.toFixed(1)
                
                return (
                  <div key={cat} className="bg-gradient-to-br from-purple-600 to-purple-800 p-3 md:p-4 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl mb-1">{emoji}</div>
                      <h3 className="text-xs md:text-sm font-semibold text-purple-200 mb-2">{cat}</h3>
                      <p className="text-sm md:text-base font-bold text-white truncate" title={dominator.team}>
                        {dominator.team}
                      </p>
                      <p className="text-lg md:text-xl font-bold text-yellow-300 mt-1">{displayValue}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Current Week Team Performance Table */}
      {currentWeekData && currentWeek && !loadingCurrentWeek && (
        <section className="bg-gray-800 p-3 md:p-6 rounded-lg overflow-x-auto">
          <h2 className="text-xl md:text-2xl font-bold mb-4">📊 Week {currentWeek} Team Performance</h2>
          <div className="min-w-full">
            <table className="w-full text-sm md:text-base">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left">Team</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left">Opponents Beaten</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left">Best Category</th>
                </tr>
              </thead>
              <tbody>
                {currentWeekTeamStats.map((teamStat, index) => (
                  <tr 
                    key={teamStat.team} 
                    className="border-t border-gray-700 hover:bg-gray-750 cursor-pointer"
                    onClick={() => setSelectedTeam(teamStat.team)}
                  >
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {teamStat.logo_url ? (
                            <img 
                              src={teamStat.logo_url} 
                              alt={teamStat.team}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement
                                img.style.display = 'none'
                                const parent = img.parentElement
                                if (parent && !parent.querySelector('.logo-placeholder')) {
                                  const placeholder = document.createElement('span')
                                  placeholder.className = 'logo-placeholder text-xs md:text-sm font-bold text-gray-400'
                                  placeholder.textContent = teamStat.team.charAt(0).toUpperCase()
                                  parent.appendChild(placeholder)
                                }
                              }}
                            />
                          ) : (
                            <span className="text-xs md:text-sm font-bold text-gray-400">
                              {teamStat.team.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                          {teamStat.team}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      {teamStat.opponents_beaten.length > 0 ? (
                        <div className="flex flex-wrap gap-1 md:gap-2">
                          {teamStat.opponents_beaten.map((opponent, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-1 bg-green-700 text-green-200 rounded text-xs md:text-sm"
                            >
                              {opponent}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs md:text-sm">None</span>
                      )}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      <span className="px-2 py-1 bg-blue-700 text-blue-200 rounded text-xs md:text-sm font-semibold">
                        {categoryEmojis[teamStat.best_category] || ''} {teamStat.best_category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs md:text-sm text-gray-400 mt-3">👆 Click on a team name to view details</p>
        </section>
      )}

      {/* Streaks & Trends KPI Bar */}
      {stats.streaks_trends && (
        <section className="bg-gray-800 p-3 md:p-6 rounded-lg">
          <h2 className="text-xl md:text-2xl font-bold mb-4">📈 Streaks & Trends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div>
              <h3 className="text-sm md:text-base font-semibold mb-2 text-green-400">🔥 Current Win Streaks</h3>
              <p className="text-xs text-gray-400 mb-2">Consecutive weeks beating scheduled opponent 5-4-0 or better (excluding current week)</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {stats.streaks_trends.current_streak_leaders.map((team, idx) => (
                  <div key={idx} className="bg-gray-700 p-2 rounded-lg flex justify-between items-center gap-2">
                    <span className="text-xs md:text-sm text-blue-400 font-medium truncate flex-1">{team.name}</span>
                    <span className="text-sm md:text-base font-bold whitespace-nowrap">{team.streak} {team.streak === 1 ? 'week' : 'weeks'}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm md:text-base font-semibold mb-2">🏆 Longest Streaks</h3>
              <p className="text-xs text-gray-400 mb-2">All-time longest consecutive wins</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {stats.streaks_trends.longest_streak_leaders.map((team, idx) => (
                  <div key={idx} className="bg-gray-700 p-2 rounded-lg flex justify-between items-center gap-2">
                    <span className="text-xs md:text-sm text-blue-400 font-medium truncate flex-1">{team.name}</span>
                    <span className="text-sm md:text-base font-bold whitespace-nowrap">{team.streak} {team.streak === 1 ? 'week' : 'weeks'}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm md:text-base font-semibold mb-2 text-green-400">🔥 Hot Teams</h3>
              <p className="text-xs text-gray-400 mb-2">Best performance in last 4 weeks</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {stats.streaks_trends.hot_teams.map((team, idx) => (
                  <div key={idx} className="bg-gray-700 p-2 rounded-lg flex justify-between items-center gap-2">
                    <span className="text-xs md:text-sm text-blue-400 font-medium truncate flex-1">{team.name}</span>
                    <span className="text-xs md:text-sm font-bold whitespace-nowrap">{team.avg.toFixed(1)} {team.avg === 1 ? 'team' : 'teams'} beaten</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* League Standings Table */}
      {stats.teams_list && stats.teams_list.length > 0 && (
        <section className="bg-gray-800 p-3 md:p-6 rounded-lg overflow-x-auto">
          <h2 className="text-xl md:text-2xl font-bold mb-4">🏆 League Standings</h2>
          <div className="min-w-full">
            <table className="w-full text-sm md:text-base">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left">Team</th>
                  <th 
                    className="px-2 md:px-4 py-2 md:py-3 text-right cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('avg_teams_beaten')}
                  >
                    Avg Wins vs Opp {sortField === 'avg_teams_beaten' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-2 md:px-4 py-2 md:py-3 text-right cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('total_wins')}
                  >
                    Total Wins {sortField === 'total_wins' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-2 md:px-4 py-2 md:py-3 text-right cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('win_percentage')}
                  >
                    Win % {sortField === 'win_percentage' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team, index) => (
                    <tr 
                      key={team.name} 
                      className="border-t border-gray-700 hover:bg-gray-750 cursor-pointer"
                      onClick={() => setSelectedTeam(team.name)}
                    >
                      <td className="px-2 md:px-4 py-2 md:py-3">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {team.logo_url ? (
                              <img 
                                src={team.logo_url} 
                                alt={team.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Show placeholder when image fails
                                  const img = e.target as HTMLImageElement
                                  img.style.display = 'none'
                                  const parent = img.parentElement
                                  if (parent && !parent.querySelector('.logo-placeholder')) {
                                    const placeholder = document.createElement('span')
                                    placeholder.className = 'logo-placeholder text-xs md:text-sm font-bold text-gray-400'
                                    placeholder.textContent = team.name.charAt(0).toUpperCase()
                                    parent.appendChild(placeholder)
                                  }
                                }}
                              />
                            ) : null}
                            {(!team.logo_url || !team.logo_url.trim()) && (
                              <span className="text-xs md:text-sm font-bold text-gray-400">
                                {team.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                            {team.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">{team.avg_teams_beaten.toFixed(1)}</td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">{team.total_wins}</td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">{team.win_percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs md:text-sm text-gray-400 mt-3">👆 Click on a team name to view details</p>
        </section>
      )}

      {/* Category Dominance */}
      <section className="bg-gray-800 p-3 md:p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold">📊 Category Dominance</h2>
          <p className="text-xs md:text-sm text-gray-400">👆 Click any category to compare all teams</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {categories.map(cat => {
            const leader = stats.category_performance.category_leaders[cat]
            if (!leader) return null
            return (
              <div key={cat} className="bg-gray-700 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors border border-transparent hover:border-blue-500" onClick={() => setSelectedCategory(cat)}>
                <h3 className="text-xs md:text-sm font-semibold text-gray-300 mb-2 text-center">{cat}</h3>
                <p className="text-sm md:text-base font-bold text-blue-400 block w-full text-center">
                  {leader.team}
                </p>
                <p className="text-lg md:text-xl font-bold mt-1 text-center">{leader.wins} {leader.wins === 1 ? 'win' : 'wins'}</p>
              </div>
            )
          })}
        </div>
        {stats.category_performance.most_balanced && (
          <div className="mt-4 p-3 md:p-4 bg-gray-700 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-1">⚖️ Most Balanced Team</h3>
            <p className="text-lg font-bold text-blue-400">
              {stats.category_performance.most_balanced}
            </p>
            <p className="text-sm text-gray-400 mt-1">Wins across all categories</p>
          </div>
        )}
      </section>

      {/* Overall Performance */}
      <section className="bg-gray-800 p-3 md:p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-4">🏆 Overall Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {stats.overall_performance.total_wins_leader && (
            <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
              <h3 className="text-xs md:text-sm text-gray-400 mb-1">🥇 Total Wins Leader</h3>
              <p className="text-base md:text-lg font-bold text-blue-400">
                {stats.overall_performance.total_wins_leader.name}
              </p>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats.overall_performance.total_wins_leader.total_wins} wins</p>
            </div>
          )}
          
          {stats.overall_performance.win_pct_leader && (
            <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
              <h3 className="text-xs md:text-sm text-gray-400 mb-1">📈 Win % Leader</h3>
              <p className="text-base md:text-lg font-bold text-blue-400">
                {stats.overall_performance.win_pct_leader.name}
              </p>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats.overall_performance.win_pct_leader.win_percentage}%</p>
            </div>
          )}
          
          {stats.overall_performance.most_dominant && (
            <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
              <h3 className="text-xs md:text-sm text-gray-400 mb-1">👑 Most Dominant</h3>
              <p className="text-base md:text-lg font-bold text-blue-400">
                {stats.overall_performance.most_dominant.name}
              </p>
              <p className="text-base md:text-lg font-bold mt-1">{stats.overall_performance.most_dominant.avg_teams_beaten.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">Average teams beaten per week</p>
            </div>
          )}
          
          {stats.overall_performance.most_consistent && (
            <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
              <h3 className="text-xs md:text-sm text-gray-400 mb-1">🎯 Most Consistent</h3>
              <p className="text-base md:text-lg font-bold text-blue-400">
                {stats.overall_performance.most_consistent.name}
              </p>
              <p className="text-xs md:text-sm text-gray-400 mt-1">Low variance</p>
            </div>
          )}
        </div>
      </section>

      {/* Activity Metrics */}
      <section className="bg-gray-800 p-3 md:p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-4">⚡ Activity Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {stats.activity_metrics.most_active && (
            <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
              <h3 className="text-xs md:text-sm text-gray-400 mb-1">🔥 Most Active</h3>
              <p className="text-base md:text-lg font-bold text-blue-400">
                {stats.activity_metrics.most_active.name}
              </p>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats.activity_metrics.most_active.avg_minutes_per_week?.toFixed(1) || stats.activity_metrics.most_active.total_minutes.toFixed(0)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.activity_metrics.most_active.avg_minutes_per_week ? 'Average minutes per week' : 'Total minutes'}</p>
            </div>
          )}
          
          {stats.activity_metrics.efficiency_leader && (
            <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
              <h3 className="text-xs md:text-sm text-gray-400 mb-1">💎 Efficiency Leader</h3>
              <p className="text-base md:text-lg font-bold text-blue-400">
                {stats.activity_metrics.efficiency_leader.name}
              </p>
              <p className="text-xl md:text-2xl font-bold mt-1">{stats.activity_metrics.efficiency_leader.efficiency.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">wins per 1000 min</p>
            </div>
          )}
        </div>
      </section>

      {/* Weekly Consistency */}
      {stats.head_to_head.most_consistent_weekly && stats.head_to_head.most_consistent_weekly.length > 0 && (
        <section className="bg-gray-800 p-3 md:p-6 rounded-lg">
          <h2 className="text-xl md:text-2xl font-bold mb-4">📊 Weekly Consistency</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Most Consistent Weekly</h3>
              <p className="text-xs text-gray-400 mb-2">Lowest variance in teams beaten per week (avg = average teams beaten per week)</p>
              <div className="space-y-2">
                {stats.head_to_head.most_consistent_weekly
                  ?.sort((a, b) => a.variance - b.variance)
                  .map((team, idx) => (
                    <div key={idx} className="bg-gray-700 p-2 md:p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm md:text-base text-blue-400 font-medium">
                        {team.name}
                      </span>
                      <div className="text-right">
                        <span className="text-sm md:text-base font-bold">{team.avg.toFixed(1)} avg</span>
                        <span className="text-xs text-gray-400 ml-2">({team.variance.toFixed(2)} var)</span>
                      </div>
                    </div>
                  )) || []}
              </div>
            </div>
            
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Least Consistent Weekly</h3>
              <p className="text-xs text-gray-400 mb-2">Highest variance in teams beaten per week (avg = average teams beaten per week)</p>
              <div className="space-y-2">
                {stats.head_to_head.least_consistent_weekly
                  ?.sort((a, b) => b.variance - a.variance)
                  .map((team, idx) => (
                    <div key={idx} className="bg-gray-700 p-2 md:p-3 rounded-lg flex justify-between items-center">
                      <span className="text-sm md:text-base text-blue-400 font-medium">
                        {team.name}
                      </span>
                      <div className="text-right">
                        <span className="text-sm md:text-base font-bold">{team.avg.toFixed(1)} avg</span>
                        <span className="text-xs text-gray-400 ml-2">({team.variance.toFixed(2)} var)</span>
                      </div>
                    </div>
                  )) || []}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Weekly Performance */}
      <section className="bg-gray-800 p-3 md:p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-4">📅 Weekly Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {stats.weekly_performance.best_single_week && (
            <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
              <h3 className="text-xs md:text-sm text-gray-400 mb-1">⭐ Best Single Week</h3>
              <p className="text-base md:text-lg font-bold text-blue-400">
                {stats.weekly_performance.best_single_week.name}
              </p>
              <p className="text-xs md:text-sm text-gray-400 mt-1">Week {stats.weekly_performance.best_single_week.week}: {stats.weekly_performance.best_single_week.teams_beaten} {stats.weekly_performance.best_single_week.teams_beaten === 1 ? 'team' : 'teams'} beaten</p>
            </div>
          )}
          
          {stats.weekly_performance.most_improved && (
            <div 
              className="bg-gray-700 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
              onClick={() => setShowImprovementModal(true)}
            >
              <h3 className="text-xs md:text-sm text-gray-400 mb-1">📈 Most Improved</h3>
              <p className="text-base md:text-lg font-bold text-blue-400">
                {stats.weekly_performance.most_improved.name}
              </p>
              <p className="text-base md:text-lg font-bold mt-1 text-green-400">
                +{stats.weekly_performance.most_improved.improvement.toFixed(1)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Calculation: Compares average teams beaten in first 4 weeks vs last 4 weeks (requires 8+ weeks played)
              </p>
              {stats.weekly_performance.most_improved.description && (
                <p className="text-xs text-gray-400 mt-1">
                  {stats.weekly_performance.most_improved.description}
                </p>
              )}
              <p className="text-xs text-blue-400 mt-2">👆 Click to view detailed comparison</p>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {selectedTeam && (
        <TeamModal
          teamName={selectedTeam}
          apiBase={apiBase}
          onClose={() => setSelectedTeam(null)}
        />
      )}
      
      {selectedWeek && (
        <WeekModal
          week={selectedWeek}
          apiBase={apiBase}
          onClose={() => setSelectedWeek(null)}
        />
      )}
      
      {selectedCategory && (
        <CategoryComparisonModal
          category={selectedCategory}
          apiBase={apiBase}
          onClose={() => setSelectedCategory(null)}
        />
      )}
      
      {showImprovementModal && (
        <ImprovementComparisonModal
          apiBase={apiBase}
          onClose={() => setShowImprovementModal(false)}
        />
      )}
    </div>
  )
}
