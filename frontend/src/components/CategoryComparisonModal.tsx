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
  const allTeams = stats?.overall_performance ? Object.values(stats.overall_performance).filter((t: any) => t && t.name) : []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold">{category} Category Leaders</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="p-4 md:p-6">
          {categoryLeader && (
            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <h3 className="text-lg font-semibold mb-2">Top Team</h3>
              <p className="text-xl font-bold text-blue-400">{categoryLeader.team}</p>
              <p className="text-sm text-gray-400 mt-1">{categoryLeader.wins} category wins</p>
            </div>
          )}
          
          <p className="text-sm text-gray-400 mb-4">
            This metric counts how many times each team won the {category} category against opponents across all weeks.
          </p>
        </div>
      </div>
    </div>
  )
}
