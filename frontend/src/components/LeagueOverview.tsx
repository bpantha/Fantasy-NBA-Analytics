'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import TeamModal from './TeamModal'
import WeekModal from './WeekModal'
import CategoryComparisonModal from './CategoryComparisonModal'

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

export default function LeagueOverview({ apiBase }: { apiBase: string }) {
  const [stats, setStats] = useState<LeagueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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

  const [sortField, setSortField] = useState<'avg_teams_beaten' | 'total_wins' | 'win_percentage'>('avg_teams_beaten')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

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

  return (
    <div className="space-y-6">
      {/* Streaks & Trends KPI Bar */}
      {stats.streaks_trends && (
        <section className="bg-gray-800 p-3 md:p-6 rounded-lg">
          <h2 className="text-xl md:text-2xl font-bold mb-4">📈 Streaks & Trends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div>
              <h3 className="text-sm md:text-base font-semibold mb-2 text-green-400">🔥 Current Win Streaks</h3>
              <p className="text-xs text-gray-400 mb-2">Consecutive weeks beating scheduled opponent 5-4-0 or better (excluding current week)</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {stats.streaks_trends.current_streak_leaders.map((team, idx) => (
                  <div key={idx} className="bg-gray-700 p-2 rounded-lg flex justify-between items-center">
                    <span className="text-xs md:text-sm text-blue-400 font-medium">{team.name}</span>
                    <span className="text-sm md:text-base font-bold">{team.streak} {team.streak === 1 ? 'week' : 'weeks'}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm md:text-base font-semibold mb-2">🏆 Longest Streaks</h3>
              <p className="text-xs text-gray-400 mb-2">All-time longest consecutive wins</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {stats.streaks_trends.longest_streak_leaders.map((team, idx) => (
                  <div key={idx} className="bg-gray-700 p-2 rounded-lg flex justify-between items-center">
                    <span className="text-xs md:text-sm text-blue-400 font-medium">{team.name}</span>
                    <span className="text-sm md:text-base font-bold">{team.streak} {team.streak === 1 ? 'week' : 'weeks'}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm md:text-base font-semibold mb-2 text-green-400">🔥 Hot Teams</h3>
              <p className="text-xs text-gray-400 mb-2">Best performance in last 4 weeks</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {stats.streaks_trends.hot_teams.map((team, idx) => (
                  <div key={idx} className="bg-gray-700 p-2 rounded-lg flex justify-between items-center">
                    <span className="text-xs md:text-sm text-blue-400 font-medium">{team.name}</span>
                    <span className="text-xs md:text-sm font-bold">{team.avg.toFixed(1)} {team.avg === 1 ? 'team' : 'teams'} beaten</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm md:text-base font-semibold mb-2 text-red-400">❄️ Cold Teams</h3>
              <p className="text-xs text-gray-400 mb-2">Worst performance in last 4 weeks</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {stats.streaks_trends.cold_teams.map((team, idx) => (
                  <div key={idx} className="bg-gray-700 p-2 rounded-lg flex justify-between items-center">
                    <span className="text-xs md:text-sm text-blue-400 font-medium">{team.name}</span>
                    <span className="text-xs md:text-sm font-bold">{team.avg.toFixed(1)} {team.avg === 1 ? 'team' : 'teams'} beaten</span>
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
                <h3 className="text-xs md:text-sm font-semibold text-gray-300 mb-2 text-center">{categoryEmojis[cat]} {cat}</h3>
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
            <div className="bg-gray-700 p-3 md:p-4 rounded-lg">
              <h3 className="text-xs md:text-sm text-gray-400 mb-1">📈 Most Improved</h3>
              <p className="text-base md:text-lg font-bold text-blue-400">
                {stats.weekly_performance.most_improved.name}
              </p>
              <p className="text-base md:text-lg font-bold mt-1 text-green-400">
                +{stats.weekly_performance.most_improved.improvement.toFixed(1)}
              </p>
              {stats.weekly_performance.most_improved.description && (
                <p className="text-xs text-gray-400 mt-1">
                  {stats.weekly_performance.most_improved.description}
                </p>
              )}
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
    </div>
  )
}
