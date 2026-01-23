'use client'

interface Team {
  name: string
  close_wins?: number
  close_losses?: number
  blowout_wins?: number
  blowout_losses?: number
}

interface ClutchDetailModalProps {
  teams: Team[]
  onClose: () => void
}

export default function ClutchDetailModal({ teams, onClose }: ClutchDetailModalProps) {
  const sorted = [...teams].sort(
    (a, b) => ((b.close_wins ?? 0) + (b.blowout_wins ?? 0)) - ((a.close_wins ?? 0) + (a.blowout_wins ?? 0))
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-3 md:p-4 flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-bold">⚡ Clutch & Close vs Blowouts — Full Table</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">×</button>
        </div>
        <div className="p-3 md:p-4">
          <p className="text-xs text-gray-400 mb-3">Close = 5-4 or 6-3. Blowout = 7-2 or worse. Scheduled opponent only, excl. current week.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-2 py-2 text-left">Team</th>
                  <th className="px-2 py-2 text-right text-green-400">Close W</th>
                  <th className="px-2 py-2 text-right text-amber-400">Close L</th>
                  <th className="px-2 py-2 text-right text-blue-400">Blowout W</th>
                  <th className="px-2 py-2 text-right text-red-400">Blowout L</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.name} className="border-t border-gray-700">
                    <td className="px-2 py-2 font-medium">{t.name}</td>
                    <td className="px-2 py-2 text-right">{t.close_wins ?? 0}</td>
                    <td className="px-2 py-2 text-right">{t.close_losses ?? 0}</td>
                    <td className="px-2 py-2 text-right">{t.blowout_wins ?? 0}</td>
                    <td className="px-2 py-2 text-right">{t.blowout_losses ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
