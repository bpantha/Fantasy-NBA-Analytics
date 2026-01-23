'use client'

import { useState } from 'react'
import useSWR from 'swr'
import MatchupPreviewModal from './MatchupPreviewModal'

export default function UpcomingMatchup({ apiBase }: { apiBase: string }) {
  const [matchupPreviewModal, setMatchupPreviewModal] = useState<{
    team1: string
    team2: string
    categories: Array<{ category: string; team1_value: number; team2_value: number; favored: string }>
  } | null>(null)

  const { data, error, isLoading } = useSWR<{
    matchups: Array<{
      team1: string
      team2: string
      categories: Array<{ category: string; team1_value: number; team2_value: number; favored: string }>
    }>
    matchup_period?: number
  }>(`${apiBase}/league/upcoming-matchups`)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading upcoming matchups...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-400">
        Error loading upcoming matchups. Please try again later.
      </div>
    )
  }

  const matchups = data?.matchups ?? []
  const matchupPeriod = data?.matchup_period

  if (matchups.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">No upcoming matchups for next week.</p>
        {matchupPeriod != null && (
          <p className="text-gray-500 text-sm mt-2">(Week {matchupPeriod} may be beyond the season or not yet scheduled.)</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="bg-gray-800 p-3 md:p-6 rounded-lg">
        <h2 className="text-xl md:text-2xl font-bold mb-4">
          🎯 Next Week&apos;s Matchup Previews{matchupPeriod ? ` (Week ${matchupPeriod})` : ''}
        </h2>
        <p className="text-xs md:text-sm text-gray-400 mb-4">
          Category favor based on roster totals (season avg). Favored = better projected total.
        </p>
        <div className="space-y-4">
          {matchups.map((m, idx) => (
            <div
              key={idx}
              className="bg-gray-700 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
              onClick={() => setMatchupPreviewModal({ team1: m.team1, team2: m.team2, categories: m.categories })}
              role="button"
            >
              <h3 className="font-semibold mb-2">{m.team1} vs {m.team2}</h3>
              <div className="flex flex-wrap gap-2">
                {m.categories.map((c) => (
                  <span
                    key={c.category}
                    className={`px-2 py-1 rounded text-xs md:text-sm ${
                      c.favored === 'toss' ? 'bg-gray-600 text-gray-300' :
                      c.favored === 'team1' ? 'bg-green-800 text-green-200' : 'bg-blue-800 text-blue-200'
                    }`}
                    title={`${c.category}: ${c.team1_value} vs ${c.team2_value}`}
                  >
                    {c.category} → {c.favored === 'toss' ? 'Toss' : c.favored === 'team1' ? m.team1 : m.team2}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-400 mt-2">👆 Click for category breakdown</p>
            </div>
          ))}
        </div>
      </section>

      {matchupPreviewModal && (
        <MatchupPreviewModal
          team1={matchupPreviewModal.team1}
          team2={matchupPreviewModal.team2}
          categories={matchupPreviewModal.categories}
          onClose={() => setMatchupPreviewModal(null)}
        />
      )}
    </div>
  )
}
