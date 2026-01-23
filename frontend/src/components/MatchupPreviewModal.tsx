'use client'

interface Cat {
  category: string
  team1_value: number
  team2_value: number
  favored: string
}

interface MatchupPreviewModalProps {
  team1: string
  team2: string
  categories: Cat[]
  onClose: () => void
}

export default function MatchupPreviewModal({ team1, team2, categories, onClose }: MatchupPreviewModalProps) {
  const fmt = (cat: string, v: number) =>
    cat === 'FG%' || cat === 'FT%' ? `${(v * 100).toFixed(1)}%` : cat === 'TO' ? v.toFixed(0) : v.toFixed(1)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-3 md:p-4 flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold">🎯 {team1} vs {team2}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">×</button>
        </div>
        <div className="p-3 md:p-4">
          <p className="text-xs text-gray-400 mb-3">Category totals (roster season avg). Favored = higher total (or lower for TO).</p>
          <table className="w-full text-sm">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-2 py-2 text-left">Category</th>
                <th className="px-2 py-2 text-right">{team1}</th>
                <th className="px-2 py-2 text-right">{team2}</th>
                <th className="px-2 py-2 text-center">Favored</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.category} className="border-t border-gray-700">
                  <td className="px-2 py-2 font-medium">{c.category}</td>
                  <td className={`px-2 py-2 text-right ${c.favored === 'team1' ? 'text-green-400' : ''}`}>{fmt(c.category, c.team1_value)}</td>
                  <td className={`px-2 py-2 text-right ${c.favored === 'team2' ? 'text-green-400' : ''}`}>{fmt(c.category, c.team2_value)}</td>
                  <td className="px-2 py-2 text-center">{c.favored === 'toss' ? 'Toss' : c.favored === 'team1' ? '✓ ' + team1 : '✓ ' + team2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
