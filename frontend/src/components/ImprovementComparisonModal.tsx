'use client'

import useSWR from 'swr'

interface ImprovementComparisonModalProps {
  apiBase: string
  onClose: () => void
}

interface ImprovedTeam {
  name: string
  improvement: number
  early_avg: number
  recent_avg: number
}

export default function ImprovementComparisonModal({ apiBase, onClose }: ImprovementComparisonModalProps) {
  const { data: stats, isLoading: loading } = useSWR<{ weekly_performance?: { improved_teams?: ImprovedTeam[] } }>(`${apiBase}/league/stats?live=true`)
  const improvedTeams = stats?.weekly_performance?.improved_teams ?? []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl md:text-2xl font-bold">📈 Most Improved Teams Comparison</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          <p className="text-sm text-gray-400 mb-4">
            Calculation: Compares average teams beaten in first 4 weeks vs last 4 weeks. Only teams with 8+ weeks played are included.
          </p>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading...</p>
            </div>
          ) : improvedTeams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No teams meet the criteria (8+ weeks played)</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left">Rank</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left">Team</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right">First 4 Weeks Avg</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right">Last 4 Weeks Avg</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right">Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  {improvedTeams.map((team, index) => (
                    <tr key={team.name} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-2 md:px-4 py-2 md:py-3">{index + 1}</td>
                      <td className="px-2 md:px-4 py-2 md:py-3 font-medium">{team.name}</td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">{team.early_avg.toFixed(2)}</td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">{team.recent_avg.toFixed(2)}</td>
                      <td className={`px-2 md:px-4 py-2 md:py-3 text-right font-bold ${
                        team.improvement > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {team.improvement > 0 ? '+' : ''}{team.improvement.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
