'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface CategoryComparisonModalProps {
  category: string
  apiBase: string
  onClose: () => void
}

export default function CategoryComparisonModal({ category, apiBase, onClose }: CategoryComparisonModalProps) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${apiBase}/league/stats`)
      .then(res => {
        setStats(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading stats:', err)
        setLoading(false)
      })
  }, [apiBase])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    )
  }

  const categoryLeader = stats?.category_performance?.category_leaders?.[category]
  
  // Get all teams and their category-specific wins
  const teamsWithCategoryWins = stats?.category_wins_by_team ? Object.entries(stats.category_wins_by_team).map(([teamName, categoryWins]: [string, any]) => {
    const teamData = stats?.teams_list?.find((t: any) => t.name === teamName)
    return {
      name: teamName,
      logo_url: teamData?.logo_url || '',
      category_wins: categoryWins[category] || 0
    }
  }).sort((a: any, b: any) => b.category_wins - a.category_wins) : []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-3 md:p-4 flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold">{category} Category Comparison</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="p-3 md:p-6">
          {categoryLeader && (
            <div className="bg-gray-700 p-3 md:p-4 rounded-lg mb-4">
              <h3 className="text-base md:text-lg font-semibold mb-2">Top Team</h3>
              <p className="text-lg md:text-xl font-bold text-blue-400">{categoryLeader.team}</p>
              <p className="text-sm text-gray-400 mt-1">{categoryLeader.wins} {categoryLeader.wins === 1 ? 'win' : 'wins'}</p>
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="text-base md:text-lg font-semibold mb-3">All Teams Ranked</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left">Rank</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left">Team</th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-right">{category} Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {teamsWithCategoryWins.map((team: any, index: number) => (
                    <tr key={team.name} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-2 md:px-4 py-2 md:py-3">{index + 1}</td>
                      <td className="px-2 md:px-4 py-2 md:py-3">
                        <div className="flex items-center gap-2">
                          {team.logo_url && (
                            <img 
                              src={team.logo_url.startsWith('http') ? team.logo_url : `https://${team.logo_url}`} 
                              alt={team.name}
                              className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          )}
                          <span className="font-medium">{team.name}</span>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">{team.category_wins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <p className="text-xs md:text-sm text-gray-400 mt-4">
            This metric counts how many times each team won the {category} category against opponents across all weeks.
          </p>
        </div>
      </div>
    </div>
  )
}
