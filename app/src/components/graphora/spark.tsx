import * as React from 'react'

type SparkProps = {
  values: number[]
  color?: string
  fill?: boolean
  className?: string
}

/**
 * Tiny inline sparkline. Plots `values` as a line with an optional filled
 * under-area. Dimensions are fixed at 160x40 viewBox; the SVG is responsive.
 */
export function Spark({ values, color = 'var(--gx-accent)', fill = true, className }: SparkProps) {
  if (!values || values.length < 2) {
    return null
  }

  const W = 160
  const H = 40
  const P = 2

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  const pts = values.map((v, i) => {
    const x = P + (i / (values.length - 1)) * (W - 2 * P)
    const y = H - P - ((v - min) / range) * (H - 2 * P)
    return [x, y] as const
  })

  const d = pts.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ')
  const da = d + ` L ${W - P} ${H - P} L ${P} ${H - P} Z`

  const last = pts[pts.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="none" style={{ width: '100%', height: 40, display: 'block' }}>
      {fill && <path d={da} fill={color} opacity="0.12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.2" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  )
}
