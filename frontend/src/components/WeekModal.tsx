'use client'

import useSWR from 'swr'

interface WeekModalProps {
  week: number
  apiBase: string
  onClose: () => void
}

export default function WeekModal({ week, apiBase, onClose }: WeekModalProps) {
  const { data: summary } = useSWR<{ current_matchup_period: number }>(`${apiBase}/league/summary`)
  const currentWeek = summary?.current_matchup_period ?? null

  const weekKey = `${apiBase}/week/${week}${currentWeek != null && week === currentWeek ? '?live=true' : ''}`
  const { data: weekData, isLoading: loading } = useSWR(weekKey)

  // Sort teams by total teams beaten
  const sortedTeams = weekData?.teams?.sort((a: any, b: any) => 
    b.total_teams_beaten - a.total_teams_beaten
  ) || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold">Week {week} Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="p-4 md:p-6">
          {loading && (
            <div className="text-center py-8">Loading...</div>
          )}

          {weekData && !loading && (
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Leaderboard</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left p-2">Rank</th>
                        <th className="text-left p-2">Team</th>
                        <th className="text-right p-2">Teams Beaten</th>
                        <th className="text-right p-2">Category Wins</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((team: any, idx: number) => (
                        <tr key={team.team_id} className="border-b border-gray-700">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2 font-medium">{team.name}</td>
                          <td className="p-2 text-right">{team.total_teams_beaten}</td>
                          <td className="p-2 text-right">{team.total_category_wins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">League Average Minutes</h3>
                <p className="text-2xl font-bold">{weekData.league_avg_minutes.toFixed(1)} minutes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
