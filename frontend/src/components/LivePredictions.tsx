'use client'

import { useState } from 'react'
import useSWR from 'swr'
// Removed bar chart imports - no longer using charts

const STANDARD_CATS = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']

interface LineupPlayer {
  name: string
  pro_team: string
  has_game: boolean
  projected_pts?: number
  projected_stats?: Record<string, number>
}

interface DayLineup {
  date_label: string
  scoring_period: number
  team1: {
    lineup: LineupPlayer[]
    projected_pts_total: number
    projected_stats?: Record<string, number>
  }
  team2: {
    lineup: LineupPlayer[]
    projected_pts_total: number
    projected_stats?: Record<string, number>
  }
}

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
  lineup_by_day?: DayLineup[]
}

interface LivePredictionsProps {
  apiBase: string
}

interface Matchup {
  team1: string
  team2: string
}

export default function LivePredictions({ apiBase }: LivePredictionsProps) {
  const [selectedMatchupIndex, setSelectedMatchupIndex] = useState<number | null>(null)

  // Matchup list (SWR caches)
  const { data: matchupsData, error: errorMatchups, isLoading: loadingMatchups, mutate: mutateMatchups } = useSWR<{ matchups: Matchup[] }>(
    `${apiBase}/predictions/matchups`
  )
  const matchups = matchupsData?.matchups ?? []

  // Prediction for selected matchup (SWR caches; key includes team1/team2, no _t to allow cache reuse)
  const selected = selectedMatchupIndex != null ? matchups[selectedMatchupIndex] : null
  const predKey = selected
    ? `${apiBase}/predictions?live=true&team1=${encodeURIComponent(selected.team1)}&team2=${encodeURIComponent(selected.team2)}`
    : null
  const { data: predData, error: errorPred, isLoading: loadingPrediction, mutate: mutatePred } = useSWR<{ predictions: Prediction[] }>(predKey)

  const prediction: Prediction | null =
    predData?.predictions?.length ? predData.predictions[0] : null
  const error = errorMatchups ?? (predKey ? errorPred : null)

  const handleRefresh = () => {
    if (predKey) mutatePred()
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
        <div className="text-red-400 mb-4">❌ {typeof error === 'string' ? error : (error as Error)?.message ?? 'Failed to load'}</div>
        <button
          onClick={() => { mutateMatchups(); if (predKey) mutatePred(); }}
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
          Select a matchup to view predictions. Predictions based on current accumulated stats + remaining games through Sunday. Only starters who are healthy (OUT and DTD excluded) are included.
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

        {/* No prediction data for this matchup */}
        {predKey && !loadingPrediction && !prediction && predData && (!predData.predictions || predData.predictions.length === 0) && (
          <div className="bg-gray-700 p-6 rounded-lg text-center text-gray-400">
            No prediction data available for this matchup
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
                <p className="text-xs text-purple-300/90 mt-2">↓ Scroll down for Lineup by Day &amp; projected stats per player</p>
              </div>

              {/* Detailed Category Breakdown */}
              <div className="bg-gray-700 p-4 md:p-6 rounded-lg">
                <h3 className="text-lg md:text-xl font-bold mb-4">Projected End-of-Week Category Totals</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Values show projected totals after all remaining games through Sunday. Only starters who are healthy (OUT and DTD excluded) are included.
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

              {/* Lineup by day + projected stats — always show section so users know where to look */}
              <div id="lineup-by-day" className="bg-gray-700 p-4 md:p-6 rounded-lg scroll-mt-4">
                <h3 className="text-lg md:text-xl font-bold mb-2">Lineup by Day & Projected Stats</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Lineup set by each team for each remaining day and that day&apos;s projected stat totals (all categories). Scroll down to see player tables.
                </p>
              {prediction.lineup_by_day && prediction.lineup_by_day.length > 0 ? (
                  <div className="space-y-6">
                    {prediction.lineup_by_day.map((day, dayIdx) => (
                      <div key={dayIdx} className="border border-gray-600 rounded-lg p-4 bg-gray-800/50">
                        <h4 className="font-semibold text-base mb-3 text-blue-300">{day.date_label}</h4>
                        {/* Day totals for both teams */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-gray-800 rounded p-2">
                            <p className="text-sm font-semibold text-gray-300 mb-1">{prediction.team1}</p>
                            {day.team1.projected_stats ? (
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                                {STANDARD_CATS.map((cat) => (
                                  <span key={cat} className="text-gray-400">
                                    {cat}: <span className="text-green-400 font-medium">
                                      {cat === 'FG%' || cat === 'FT%' ? `${((day.team1.projected_stats?.[cat] ?? 0) * 100).toFixed(1)}%` : (day.team1.projected_stats?.[cat] ?? 0).toFixed(1)}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-green-400 text-sm">Projected: {day.team1.projected_pts_total} PTS</p>
                            )}
                          </div>
                          <div className="bg-gray-800 rounded p-2">
                            <p className="text-sm font-semibold text-gray-300 mb-1">{prediction.team2}</p>
                            {day.team2.projected_stats ? (
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                                {STANDARD_CATS.map((cat) => (
                                  <span key={cat} className="text-gray-400">
                                    {cat}: <span className="text-red-400 font-medium">
                                      {cat === 'FG%' || cat === 'FT%' ? `${((day.team2.projected_stats?.[cat] ?? 0) * 100).toFixed(1)}%` : (day.team2.projected_stats?.[cat] ?? 0).toFixed(1)}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-red-400 text-sm">Projected: {day.team2.projected_pts_total} PTS</p>
                            )}
                          </div>
                        </div>
                        {/* Per-team lineups with all stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-300 mb-2">{prediction.team1} — lineup</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-400 border-b border-gray-600">
                                    <th className="text-left py-1 pr-2">Player</th>
                                    {STANDARD_CATS.map((c) => (
                                      <th key={c} className="text-right py-1 px-0.5 whitespace-nowrap">{c}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {day.team1.lineup.map((p, i) => (
                                    <tr key={i} className={p.has_game ? 'text-gray-300' : 'text-gray-500'}>
                                      <td className="py-0.5 pr-2">
                                        {p.name}
                                        {p.pro_team && <span className="text-gray-500 ml-0.5">({p.pro_team})</span>}
                                      </td>
                                      {STANDARD_CATS.map((cat) => (
                                        <td key={cat} className="text-right py-0.5 px-0.5">
                                          {p.has_game && p.projected_stats
                                            ? (cat === 'FG%' || cat === 'FT%'
                                                ? `${((p.projected_stats?.[cat] ?? 0) * 100).toFixed(1)}%`
                                                : (p.projected_stats?.[cat] ?? 0).toFixed(1))
                                            : '—'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-300 mb-2">{prediction.team2} — lineup</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-400 border-b border-gray-600">
                                    <th className="text-left py-1 pr-2">Player</th>
                                    {STANDARD_CATS.map((c) => (
                                      <th key={c} className="text-right py-1 px-0.5 whitespace-nowrap">{c}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {day.team2.lineup.map((p, i) => (
                                    <tr key={i} className={p.has_game ? 'text-gray-300' : 'text-gray-500'}>
                                      <td className="py-0.5 pr-2">
                                        {p.name}
                                        {p.pro_team && <span className="text-gray-500 ml-0.5">({p.pro_team})</span>}
                                      </td>
                                      {STANDARD_CATS.map((cat) => (
                                        <td key={cat} className="text-right py-0.5 px-0.5">
                                          {p.has_game && p.projected_stats
                                            ? (cat === 'FG%' || cat === 'FT%'
                                                ? `${((p.projected_stats?.[cat] ?? 0) * 100).toFixed(1)}%`
                                                : (p.projected_stats?.[cat] ?? 0).toFixed(1))
                                            : '—'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              ) : (
                <p className="text-gray-400 text-sm py-4">
                  No lineup-by-day data for this matchup. Try clicking Refresh, or check back during an active matchup week.
                </p>
              )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
