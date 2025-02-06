'use client'

interface ComparisonRow {
  feature: string
  easy: string
  expert: string
}

interface ComparisonTableProps {
  headers: string[]
  rows: ComparisonRow[]
}

export function ComparisonTable({ headers, rows }: ComparisonTableProps) {
  return (
    <div className="w-full mt-8 bg-white rounded-lg overflow-hidden border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            {headers.map((header) => (
              <th
                key={header}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.feature}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {row.feature}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {row.easy}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {row.expert}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
