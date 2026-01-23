'use client'

interface MatchupDetails {
  won: number
  lost: number
  tied: number
  won_cats: string[]
  lost_cats: string[]
}

interface OpponentDetailModalProps {
  teamName: string
  opponentName: string
  matchupDetails: MatchupDetails
  teamCategoryTotals: Record<string, number>
  opponentCategoryTotals: Record<string, number>
  onClose: () => void
}

const CATEGORIES = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']

export default function OpponentDetailModal({
  teamName,
  opponentName,
  matchupDetails,
  teamCategoryTotals,
  opponentCategoryTotals,
  onClose,
}: OpponentDetailModalProps) {
  const fmt = (cat: string, v: number) =>
    cat === 'FG%' || cat === 'FT%' ? `${(v * 100).toFixed(1)}%` : cat === 'TO' ? v.toFixed(0) : v.toFixed(1)
  const isBetter = (cat: string, a: number, b: number) => (cat === 'TO' ? a < b : a > b)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-3 md:p-4 flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold">⚔️ {teamName} vs {opponentName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">×</button>
        </div>
        <div className="p-3 md:p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center bg-gray-700 p-3 rounded-lg">
            <div>
              <p className="text-xl font-bold text-green-400">{matchupDetails.won}</p>
              <p className="text-xs text-gray-400">Won</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-400">{matchupDetails.lost}</p>
              <p className="text-xs text-gray-400">Lost</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-400">{matchupDetails.tied}</p>
              <p className="text-xs text-gray-400">Tied</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">Category-by-category comparison this week.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-2 py-2 text-left">Category</th>
                  <th className="px-2 py-2 text-right">{teamName}</th>
                  <th className="px-2 py-2 text-right">{opponentName}</th>
                  <th className="px-2 py-2 text-center">Winner</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((cat) => {
                  const my = teamCategoryTotals[cat] ?? 0
                  const opp = opponentCategoryTotals[cat] ?? 0
                  const better = isBetter(cat, my, opp)
                  const isTie = my === opp
                  let winner = 'Tie'
                  if (!isTie) winner = better ? teamName : opponentName
                  return (
                    <tr key={cat} className="border-t border-gray-700">
                      <td className="px-2 py-2 font-medium">{cat}</td>
                      <td className={`px-2 py-2 text-right ${better && !isTie ? 'text-green-400' : ''}`}>{fmt(cat, my)}</td>
                      <td className={`px-2 py-2 text-right ${!better && !isTie ? 'text-green-400' : ''}`}>{fmt(cat, opp)}</td>
                      <td className="px-2 py-2 text-center text-gray-300">{winner}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
