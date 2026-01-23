'use client'

interface Team {
  name: string
  [k: string]: unknown
}

interface MetricRankModalProps {
  title: string
  valueKey: string
  valueLabel: string
  teams: Team[]
  formatValue?: (v: unknown) => string
  /** If true, sort ascending (lower is better, e.g. variance). Default false = descending. */
  sortAscending?: boolean
  onClose: () => void
}

export default function MetricRankModal({
  title,
  valueKey,
  valueLabel,
  teams,
  formatValue = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v ?? '—')),
  sortAscending = false,
  onClose,
}: MetricRankModalProps) {
  const sorted = [...teams]
    .map((t) => ({ name: t.name, value: t[valueKey], logo_url: t.logo_url }))
    .filter((r) => r.value != null)
  sorted.sort((a, b) => {
    const u = a.value as number
    const v = b.value as number
    if (typeof u !== 'number' || typeof v !== 'number') return 0
    return sortAscending ? u - v : v - u
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-3 md:p-4 flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">×</button>
        </div>
        <div className="p-3 md:p-4">
          <p className="text-xs text-gray-400 mb-3">Full league ranked by {valueLabel}.</p>
          <table className="w-full text-sm">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-2 py-2 text-left">Rank</th>
                <th className="px-2 py-2 text-left">Team</th>
                <th className="px-2 py-2 text-right">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => (
                <tr key={t.name} className="border-t border-gray-700">
                  <td className="px-2 py-2">{i + 1}</td>
                  <td className="px-2 py-2 font-medium">{t.name}</td>
                  <td className="px-2 py-2 text-right">{formatValue(t.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
