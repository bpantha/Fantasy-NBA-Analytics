'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
// Removed bar chart imports - no longer using charts

interface Prediction {
  team1: string
  team2: string
  categories: {
    category: string
    team1_value: number
    team2_value: number
    winner: string
    team1_projected: number
    team2_projected: number
  }[]
  projected_score: string
  confidence: number
}

interface LivePredictionsProps {
  apiBase: string
}

export default function LivePredictions({ apiBase }: LivePredictionsProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMatchup, setSelectedMatchup] = useState<number | null>(null)

  useEffect(() => {
    fetchPredictions()
  }, [])

  const fetchPredictions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${apiBase}/predictions`)
      setPredictions(response.data.predictions || [])
      if (response.data.predictions && response.data.predictions.length > 0) {
        setSelectedMatchup(0)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load predictions')
      console.error('Error fetching predictions:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCategoryValue = (category: string, value: number): string => {
    if (category === 'FG%' || category === 'FT%') {
      return `${(value * 100).toFixed(1)}%`
    }
    return value.toFixed(1)
  }

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg text-center">
        <p className="text-gray-400">🔄 Loading live predictions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="text-red-400 mb-4">❌ {error}</div>
        <button
          onClick={fetchPredictions}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          Retry
        </button>
      </div>
    )
  }

  if (predictions.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg text-center">
        <p className="text-gray-400">No matchups available for predictions</p>
        <p className="text-xs text-gray-500 mt-2">Predictions are only available during active matchup weeks</p>
      </div>
    )
  }

  const selectedPrediction = selectedMatchup !== null ? predictions[selectedMatchup] : null

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold">🔮 Live Matchup Predictions</h2>
          <button
            onClick={fetchPredictions}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
          >
            🔄 Refresh
          </button>
        </div>
        <p className="text-xs md:text-sm text-gray-400 mb-4">
          Predictions based on current lineups, player injuries, and projected stats. Updates in real-time.
        </p>

        {/* Matchup Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Select Matchup:</label>
          <select
            value={selectedMatchup ?? ''}
            onChange={(e) => setSelectedMatchup(Number(e.target.value))}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded"
          >
            {predictions.map((pred, idx) => (
              <option key={idx} value={idx}>
                {pred.team1} vs {pred.team2}
              </option>
            ))}
          </select>
        </div>

        {selectedPrediction && (() => {
          // Determine winner
          const scoreParts = selectedPrediction.projected_score.split('-')
          const team1Wins = parseInt(scoreParts[0])
          const team2Wins = parseInt(scoreParts[1])
          const winner = team1Wins > team2Wins ? selectedPrediction.team1 : 
                        team2Wins > team1Wins ? selectedPrediction.team2 : 
                        'Tie'
          
          return (
            <div className="space-y-6">
              {/* Projected Score and Winner */}
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-4 md:p-6 rounded-lg text-center">
                <h3 className="text-lg md:text-xl font-bold mb-2">Projected Final Score</h3>
                <p className="text-3xl md:text-4xl font-bold mb-2">{selectedPrediction.projected_score}</p>
                {winner !== 'Tie' && (
                  <p className="text-xl md:text-2xl font-bold text-yellow-300 mt-2">
                    🏆 Winner: {winner}
                  </p>
                )}
                {winner === 'Tie' && (
                  <p className="text-xl md:text-2xl font-bold text-gray-300 mt-2">
                    🤝 Tie Game
                  </p>
                )}
                <p className="text-sm text-purple-200 mt-2">Confidence: {selectedPrediction.confidence}%</p>
                <p className="text-xs text-purple-200/80 mt-1">Projections based on current stats + remaining games through Sunday</p>
              </div>

              {/* Detailed Category Breakdown */}
              <div className="bg-gray-700 p-4 md:p-6 rounded-lg">
                <h3 className="text-lg md:text-xl font-bold mb-4">Projected End-of-Week Category Totals</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Values show projected totals after all remaining games through Sunday. Only healthy/DTD players are included.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {selectedPrediction.categories.map((cat, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border-2 ${
                        cat.winner === selectedPrediction.team1 
                          ? 'border-green-500 bg-green-900/20' 
                          : cat.winner === selectedPrediction.team2
                          ? 'border-red-500 bg-red-900/20'
                          : 'border-gray-600 bg-gray-800'
                      }`}
                    >
                      <h4 className="font-bold text-center mb-2">{cat.category}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className={cat.winner === selectedPrediction.team1 ? 'text-green-400 font-bold' : 'text-gray-300'}>
                            {selectedPrediction.team1}:
                          </span>
                          <span className={cat.winner === selectedPrediction.team1 ? 'text-green-400 font-bold' : 'text-gray-300'}>
                            {formatCategoryValue(cat.category, cat.team1_projected)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={cat.winner === selectedPrediction.team2 ? 'text-red-400 font-bold' : 'text-gray-300'}>
                            {selectedPrediction.team2}:
                          </span>
                          <span className={cat.winner === selectedPrediction.team2 ? 'text-red-400 font-bold' : 'text-gray-300'}>
                            {formatCategoryValue(cat.category, cat.team2_projected)}
                          </span>
                        </div>
                        {cat.winner !== 'Tie' && (
                          <p className="text-xs text-center mt-2 text-gray-400">
                            Winner: {cat.winner}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
