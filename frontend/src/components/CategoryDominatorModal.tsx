'use client'

interface Team {
  name: string
  category_totals?: Record<string, number>
  logo_url?: string
}

interface CategoryDominatorModalProps {
  category: string
  teams: Team[]
  emoji?: string
  onClose: () => void
}

export default function CategoryDominatorModal({ category, teams, emoji = '📊', onClose }: CategoryDominatorModalProps) {
  const isTO = category === 'TO'
  const sorted = [...teams]
    .map((t) => ({
      name: t.name,
      value: t.category_totals?.[category] ?? (isTO ? Infinity : -Infinity),
      logo_url: t.logo_url,
    }))
    .filter((r) => isTO ? r.value !== Infinity : r.value > -Infinity)
  if (isTO) {
    sorted.sort((a, b) => (a.value as number) - (b.value as number))
  } else {
    sorted.sort((a, b) => (b.value as number) - (a.value as number))
  }

  const format = (v: number) =>
    category === 'FG%' || category === 'FT%'
      ? `${(v * 100).toFixed(1)}%`
      : category === 'TO'
        ? v.toFixed(0)
        : v.toFixed(1)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-3 md:p-4 flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold">{emoji} {category} — Week Rankings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">×</button>
        </div>
        <div className="p-3 md:p-4">
          <p className="text-xs text-gray-400 mb-3">All teams ranked by {category} this week. {isTO ? 'Lower is better.' : 'Higher is better.'}</p>
          <table className="w-full text-sm">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-2 py-2 text-left">Rank</th>
                <th className="px-2 py-2 text-left">Team</th>
                <th className="px-2 py-2 text-right">{category}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => (
                <tr key={t.name} className="border-t border-gray-700">
                  <td className="px-2 py-2">{i + 1}</td>
                  <td className="px-2 py-2 font-medium">{t.name}</td>
                  <td className="px-2 py-2 text-right">{format(t.value as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
