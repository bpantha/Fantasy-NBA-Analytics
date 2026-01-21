'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface TeamModalProps {
  teamName: string
  apiBase: string
  onClose: () => void
}

export default function TeamModal({ teamName, apiBase, onClose }: TeamModalProps) {
  const [weeks, setWeeks] = useState<number[]>([])
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [weekData, setWeekData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axios.get(`${apiBase}/weeks`)
      .then(res => {
        const availableWeeks = res.data.weeks.sort((a: number, b: number) => b - a)
        setWeeks(availableWeeks)
        if (availableWeeks.length > 0) {
          setSelectedWeek(availableWeeks[0])
        }
      })
      .catch(err => console.error('Error loading weeks:', err))
  }, [apiBase])

  useEffect(() => {
    if (selectedWeek) {
      setLoading(true)
      axios.get(`${apiBase}/week/${selectedWeek}`)
        .then(res => {
          setWeekData(res.data)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error loading week data:', err)
          setLoading(false)
        })
    }
  }, [selectedWeek, apiBase])

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
              {weeks.map(week => {
                // Try to get week dates from weekData if available
                let label = `Week ${week}`
                if (weekData && week === selectedWeek && weekData.week_start_date && weekData.week_end_date) {
                  const start = new Date(weekData.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const end = new Date(weekData.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  label = `Week ${week} (${start} - ${end})`
                }
                return <option key={week} value={week}>{label}</option>
              })}
            </select>
          </div>

          {loading && (
            <div className="text-center py-8">Loading...</div>
          )}

          {teamData && !loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">Teams Beaten</h3>
                  <p className="text-2xl font-bold">{teamData.total_teams_beaten}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">Category Wins</h3>
                  <p className="text-2xl font-bold">{teamData.total_category_wins}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">Minutes</h3>
                  <p className="text-2xl font-bold">{teamData.minutes_played.toFixed(0)}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm text-gray-400 mb-1">vs League Avg Minutes</h3>
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
                  <h3 className="text-lg font-semibold mb-2">vs {teamData.opponent_name}</h3>
                  {teamData.matchup_details[teamData.opponent_name] && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">
                          {teamData.matchup_details[teamData.opponent_name].won}
                        </p>
                        <p className="text-sm text-gray-400">Won</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-400">
                          {teamData.matchup_details[teamData.opponent_name].lost}
                        </p>
                        <p className="text-sm text-gray-400">Lost</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-400">
                          {teamData.matchup_details[teamData.opponent_name].tied}
                        </p>
                        <p className="text-sm text-gray-400">Tied</p>
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
