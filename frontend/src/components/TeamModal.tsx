'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

interface TeamModalProps {
  teamName: string
  apiBase: string
  onClose: () => void
}

export default function TeamModal({ teamName, apiBase, onClose }: TeamModalProps) {
  const { data: weeksData } = useSWR<{ weeks: number[]; current_week?: number }>(`${apiBase}/weeks`)
  const { data: summary } = useSWR<{ current_matchup_period: number }>(`${apiBase}/league/summary`)

  const weeks = (weeksData?.weeks ?? []).sort((a: number, b: number) => b - a)
  const currentWeek = weeksData?.current_week ?? summary?.current_matchup_period ?? null

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  useEffect(() => {
    if (weeks.length > 0 && selectedWeek == null) {
      const defaultWeek = currentWeek != null && weeks.includes(currentWeek) ? currentWeek : weeks[0]
      setSelectedWeek(defaultWeek)
    }
  }, [weeks, currentWeek, selectedWeek])

  const weekKey = selectedWeek
    ? (currentWeek != null && selectedWeek === currentWeek ? `${apiBase}/week/current` : `${apiBase}/week/${selectedWeek}`)
    : null
  const { data: weekData, isLoading: loading } = useSWR(weekKey)

  const teamData = weekData?.teams?.find((t: any) => t.name === teamName)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold">{teamName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="p-4 md:p-6">
          <div className="mb-4">
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

          {loading && (
            <div className="text-center py-8">Loading...</div>
          )}

          {teamData && !loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">🏆 Teams Beaten</h3>
                  <p className="text-2xl font-bold">{teamData.total_teams_beaten}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">✅ Category Wins</h3>
                  <p className="text-2xl font-bold">{teamData.total_category_wins}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">⏱️ Minutes</h3>
                  <p className="text-2xl font-bold">{teamData.minutes_played.toFixed(0)}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">📊 vs League Avg Minutes</h3>
                  <p className="text-2xl font-bold">
                    {teamData.minutes_vs_league_avg > 0 ? '+' : ''}
                    {teamData.minutes_vs_league_avg.toFixed(1)}
                  </p>
                  {weekData && (
                    <p className="text-xs text-gray-400 mt-1">Week {selectedWeek} League Avg: {weekData.league_avg_minutes.toFixed(1)} min</p>
                  )}
                </div>
              </div>

              {teamData.opponent_name && (
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">⚔️ vs {teamData.opponent_name}</h3>
                  {teamData.matchup_details[teamData.opponent_name] && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">
                          {teamData.matchup_details[teamData.opponent_name].won}
                        </p>
                        <p className="text-sm text-gray-400">✅ Won</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-400">
                          {teamData.matchup_details[teamData.opponent_name].lost}
                        </p>
                        <p className="text-sm text-gray-400">❌ Lost</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-400">
                          {teamData.matchup_details[teamData.opponent_name].tied}
                        </p>
                        <p className="text-sm text-gray-400">🤝 Tied</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
