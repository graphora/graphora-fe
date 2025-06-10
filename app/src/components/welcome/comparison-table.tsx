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
    <div className="w-full mt-8 bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((header) => (
              <th
                key={header}
                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.feature}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-card-foreground">
                {row.feature}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {row.easy}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {row.expert}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
