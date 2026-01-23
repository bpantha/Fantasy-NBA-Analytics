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

interface Matchup {
  team1: string
  team2: string
}

export default function LivePredictions({ apiBase }: LivePredictionsProps) {
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [selectedMatchupIndex, setSelectedMatchupIndex] = useState<number | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loadingMatchups, setLoadingMatchups] = useState(false)
  const [loadingPrediction, setLoadingPrediction] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load matchup list on mount (lightweight - just team names)
  useEffect(() => {
    loadMatchupList()
  }, [apiBase])

  const loadMatchupList = async () => {
    try {
      setLoadingMatchups(true)
      setError(null)
      const response = await axios.get(`${apiBase}/predictions/matchups`)
      setMatchups(response.data.matchups || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load matchups')
      console.error('Error loading matchups:', err)
    } finally {
      setLoadingMatchups(false)
    }
  }

  // Load prediction data when matchup is selected
  useEffect(() => {
    if (selectedMatchupIndex !== null && matchups[selectedMatchupIndex]) {
      loadPredictionForMatchup(matchups[selectedMatchupIndex])
    } else {
      setPrediction(null)
    }
  }, [selectedMatchupIndex, matchups])

  const loadPredictionForMatchup = async (matchup: Matchup) => {
    try {
      setLoadingPrediction(true)
      setError(null)
      // Fetch prediction for specific matchup
      const response = await axios.get(`${apiBase}/predictions`, {
        params: { 
          live: 'true', 
          team1: matchup.team1,
          team2: matchup.team2,
          _t: Date.now() 
        }
      })
      const predictions = response.data.predictions || []
      if (predictions.length > 0) {
        setPrediction(predictions[0]) // Should only be one match
      } else {
        setPrediction(null)
        setError('No prediction data available for this matchup')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load prediction')
      console.error('Error fetching prediction:', err)
      setPrediction(null)
    } finally {
      setLoadingPrediction(false)
    }
  }

  // Refresh current prediction
  const handleRefresh = () => {
    if (selectedMatchupIndex !== null && matchups[selectedMatchupIndex]) {
      loadPredictionForMatchup(matchups[selectedMatchupIndex])
    }
  }

  const formatCategoryValue = (category: string, value: number): string => {
    if (category === 'FG%' || category === 'FT%') {
      return `${(value * 100).toFixed(1)}%`
    }
    return value.toFixed(1)
  }

  // Loading matchups
  if (loadingMatchups) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">🔄 Loading matchups...</p>
      </div>
    )
  }

  // Error state
  if (error && !prediction) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="text-red-400 mb-4">❌ {error}</div>
        <button
          onClick={loadMatchupList}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          Retry
        </button>
      </div>
    )
  }

  // No matchups available
  if (matchups.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg text-center">
        <p className="text-gray-400">No matchups available for predictions</p>
        <p className="text-xs text-gray-500 mt-2">Predictions are only available during active matchup weeks</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold">🔮 Live Matchup Predictions</h2>
          {prediction && (
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
              disabled={loadingPrediction}
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <p className="text-xs md:text-sm text-gray-400 mb-4">
          Select a matchup to view predictions. Predictions based on current accumulated stats + remaining games through Sunday. Only healthy/DTD players included.
        </p>

        {/* Matchup Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Select Matchup:</label>
          <select
            value={selectedMatchupIndex ?? ''}
            onChange={(e) => setSelectedMatchupIndex(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded"
          >
            <option value="">-- Select a matchup --</option>
            {matchups.map((matchup, idx) => (
              <option key={idx} value={idx}>
                {matchup.team1} vs {matchup.team2}
              </option>
            ))}
          </select>
        </div>

        {/* Loading prediction */}
        {loadingPrediction && (
          <div className="bg-gray-700 p-6 rounded-lg text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">Loading prediction data...</p>
          </div>
        )}

        {/* Show prediction data */}
        {prediction && !loadingPrediction && (() => {
          // Determine winner
          const scoreParts = prediction.projected_score.split('-')
          const team1Wins = parseInt(scoreParts[0])
          const team2Wins = parseInt(scoreParts[1])
          const winner = team1Wins > team2Wins ? prediction.team1 : 
                        team2Wins > team1Wins ? prediction.team2 : 
                        'Tie'
          
          return (
            <div className="space-y-6">
              {/* Projected Score and Winner */}
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-4 md:p-6 rounded-lg text-center">
                <h3 className="text-lg md:text-xl font-bold mb-2">Projected Final Score</h3>
                <p className="text-3xl md:text-4xl font-bold mb-2">{prediction.projected_score}</p>
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
                <p className="text-sm text-purple-200 mt-2">Confidence: {prediction.confidence}%</p>
                <p className="text-xs text-purple-200/80 mt-1">Projections based on current stats + remaining games through Sunday</p>
              </div>

              {/* Detailed Category Breakdown */}
              <div className="bg-gray-700 p-4 md:p-6 rounded-lg">
                <h3 className="text-lg md:text-xl font-bold mb-4">Projected End-of-Week Category Totals</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Values show projected totals after all remaining games through Sunday. Only healthy/DTD players are included.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {prediction.categories.map((cat, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border-2 ${
                        cat.winner === prediction.team1 
                          ? 'border-green-500 bg-green-900/20' 
                          : cat.winner === prediction.team2
                          ? 'border-red-500 bg-red-900/20'
                          : 'border-gray-600 bg-gray-800'
                      }`}
                    >
                      <h4 className="font-bold text-center mb-2">{cat.category}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className={cat.winner === prediction.team1 ? 'text-green-400 font-bold' : 'text-gray-300'}>
                            {prediction.team1}:
                          </span>
                          <span className={cat.winner === prediction.team1 ? 'text-green-400 font-bold' : 'text-gray-300'}>
                            {formatCategoryValue(cat.category, cat.team1_projected)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={cat.winner === prediction.team2 ? 'text-red-400 font-bold' : 'text-gray-300'}>
                            {prediction.team2}:
                          </span>
                          <span className={cat.winner === prediction.team2 ? 'text-red-400 font-bold' : 'text-gray-300'}>
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
