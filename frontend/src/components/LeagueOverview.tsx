'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import TeamModal from './TeamModal'
import WeekModal from './WeekModal'

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
    most_rivalries: Array<any>
    dominant_matchups: Array<any>
  }
  weekly_performance: {
    best_single_week: any
    most_improved: any
  }
}

export default function LeagueOverview({ apiBase }: { apiBase: string }) {
  const [stats, setStats] = useState<LeagueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

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

  return (
    <div className="space-y-6">
      {/* Overall Performance */}
      <section className="bg-gray-800 p-4 md:p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Overall Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.overall_performance.total_wins_leader && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400 mb-1">Total Wins Leader</h3>
              <button
                onClick={() => setSelectedTeam(stats.overall_performance.total_wins_leader.name)}
                className="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {stats.overall_performance.total_wins_leader.name}
              </button>
              <p className="text-2xl font-bold mt-1">{stats.overall_performance.total_wins_leader.total_wins} wins</p>
            </div>
          )}
          
          {stats.overall_performance.win_pct_leader && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400 mb-1">Win % Leader</h3>
              <button
                onClick={() => setSelectedTeam(stats.overall_performance.win_pct_leader.name)}
                className="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {stats.overall_performance.win_pct_leader.name}
              </button>
              <p className="text-2xl font-bold mt-1">{stats.overall_performance.win_pct_leader.win_percentage}%</p>
            </div>
          )}
          
          {stats.overall_performance.most_dominant && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400 mb-1">Most Dominant</h3>
              <button
                onClick={() => setSelectedTeam(stats.overall_performance.most_dominant.name)}
                className="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {stats.overall_performance.most_dominant.name}
              </button>
              <p className="text-2xl font-bold mt-1">{stats.overall_performance.most_dominant.avg_teams_beaten.toFixed(1)} avg/week</p>
            </div>
          )}
          
          {stats.overall_performance.most_consistent && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400 mb-1">Most Consistent</h3>
              <button
                onClick={() => setSelectedTeam(stats.overall_performance.most_consistent.name)}
                className="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {stats.overall_performance.most_consistent.name}
              </button>
              <p className="text-sm text-gray-400 mt-1">Low variance</p>
            </div>
          )}
        </div>
      </section>

      {/* Category Performance */}
      <section className="bg-gray-800 p-4 md:p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Category Dominance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {categories.map(cat => {
            const leader = stats.category_performance.category_leaders[cat]
            if (!leader) return null
            return (
              <div key={cat} className="bg-gray-700 p-3 md:p-4 rounded-lg">
                <h3 className="text-xs md:text-sm font-semibold text-gray-300 mb-2">{cat}</h3>
                <button
                  onClick={() => setSelectedTeam(leader.team)}
                  className="text-sm md:text-base font-bold text-blue-400 hover:text-blue-300 transition-colors block"
                >
                  {leader.team}
                </button>
                <p className="text-lg md:text-xl font-bold mt-1">{leader.wins} wins</p>
              </div>
            )
          })}
        </div>
        {stats.category_performance.most_balanced && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-1">Most Balanced Team</h3>
            <button
              onClick={() => setSelectedTeam(stats.category_performance.most_balanced!)}
              className="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {stats.category_performance.most_balanced}
            </button>
            <p className="text-sm text-gray-400 mt-1">Wins across all categories</p>
          </div>
        )}
      </section>

      {/* Activity Metrics */}
      <section className="bg-gray-800 p-4 md:p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Activity Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.activity_metrics.most_active && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400 mb-1">Most Active</h3>
              <button
                onClick={() => setSelectedTeam(stats.activity_metrics.most_active.name)}
                className="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {stats.activity_metrics.most_active.name}
              </button>
              <p className="text-2xl font-bold mt-1">{stats.activity_metrics.most_active.total_minutes.toFixed(0)} min</p>
            </div>
          )}
          
          {stats.activity_metrics.efficiency_leader && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400 mb-1">Efficiency Leader</h3>
              <button
                onClick={() => setSelectedTeam(stats.activity_metrics.efficiency_leader.name)}
                className="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {stats.activity_metrics.efficiency_leader.name}
              </button>
              <p className="text-2xl font-bold mt-1">{stats.activity_metrics.efficiency_leader.efficiency.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">wins per 1000 min</p>
            </div>
          )}
        </div>
      </section>

      {/* Streaks & Trends */}
      <section className="bg-gray-800 p-4 md:p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Streaks & Trends</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Current Win Streaks</h3>
            <div className="space-y-2">
              {stats.streaks_trends.current_streak_leaders.map((team, idx) => (
                <div key={idx} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                  <button
                    onClick={() => setSelectedTeam(team.name)}
                    className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    {team.name}
                  </button>
                  <span className="text-xl font-bold">{team.streak} weeks</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Longest Streaks (All-Time)</h3>
            <div className="space-y-2">
              {stats.streaks_trends.longest_streak_leaders.map((team, idx) => (
                <div key={idx} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                  <button
                    onClick={() => setSelectedTeam(team.name)}
                    className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    {team.name}
                  </button>
                  <span className="text-xl font-bold">{team.streak} weeks</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-green-400">🔥 Hot Teams (Last 4 Weeks)</h3>
            <div className="space-y-2">
              {stats.streaks_trends.hot_teams.map((team, idx) => (
                <div key={idx} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                  <button
                    onClick={() => setSelectedTeam(team.name)}
                    className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    {team.name}
                  </button>
                  <span className="text-lg font-bold">{team.avg.toFixed(1)} avg</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-red-400">❄️ Cold Teams (Last 4 Weeks)</h3>
            <div className="space-y-2">
              {stats.streaks_trends.cold_teams.map((team, idx) => (
                <div key={idx} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                  <button
                    onClick={() => setSelectedTeam(team.name)}
                    className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    {team.name}
                  </button>
                  <span className="text-lg font-bold">{team.avg.toFixed(1)} avg</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Head-to-Head */}
      <section className="bg-gray-800 p-4 md:p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Head-to-Head</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Most Rivalries</h3>
            <div className="space-y-2">
              {stats.head_to_head.most_rivalries.map((rivalry, idx) => (
                <div key={idx} className="bg-gray-700 p-3 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedTeam(rivalry.team1)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {rivalry.team1}
                    </button>
                    <span className="text-gray-400">vs</span>
                    <button
                      onClick={() => setSelectedTeam(rivalry.team2)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {rivalry.team2}
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {rivalry.wins}-{rivalry.losses} ({rivalry.total} matchups)
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Dominant Matchups</h3>
            <div className="space-y-2">
              {stats.head_to_head.dominant_matchups.map((matchup, idx) => (
                <div key={idx} className="bg-gray-700 p-3 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedTeam(matchup.team1)}
                      className="text-green-400 hover:text-green-300 transition-colors font-semibold"
                    >
                      {matchup.team1}
                    </button>
                    <span className="text-gray-400">dominates</span>
                    <button
                      onClick={() => setSelectedTeam(matchup.team2)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      {matchup.team2}
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{matchup.win_rate}% win rate</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Performance */}
      <section className="bg-gray-800 p-4 md:p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Weekly Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.weekly_performance.best_single_week && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400 mb-1">Best Single Week</h3>
              <button
                onClick={() => setSelectedTeam(stats.weekly_performance.best_single_week.name)}
                className="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {stats.weekly_performance.best_single_week.name}
              </button>
              <div className="mt-2">
                <button
                  onClick={() => setSelectedWeek(stats.weekly_performance.best_single_week.week)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Week {stats.weekly_performance.best_single_week.week}
                </button>
                <p className="text-2xl font-bold mt-1">
                  {stats.weekly_performance.best_single_week.teams_beaten} teams beaten
                </p>
              </div>
            </div>
          )}
          
          {stats.weekly_performance.most_improved && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm text-gray-400 mb-1">Most Improved</h3>
              <button
                onClick={() => setSelectedTeam(stats.weekly_performance.most_improved.name)}
                className="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {stats.weekly_performance.most_improved.name}
              </button>
              <p className="text-2xl font-bold mt-1 text-green-400">
                +{stats.weekly_performance.most_improved.improvement.toFixed(1)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.weekly_performance.most_improved.early_avg} → {stats.weekly_performance.most_improved.recent_avg} avg
              </p>
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
    </div>
  )
}
