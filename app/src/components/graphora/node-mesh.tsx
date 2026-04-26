import * as React from 'react'

type NodeMeshProps = {
  seed?: number
  className?: string
}

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

/**
 * Static corner node-mesh motif — used in empty states and decorative corners.
 * Deterministic layout via seeded RNG.
 */
export function NodeMesh({ seed = 1, className }: NodeMeshProps) {
  const { pts, edges } = React.useMemo(() => {
    const r = rng(seed)
    const pts = Array.from({ length: 14 }, () => ({ x: r(), y: r() }))
    const edges: [number, number][] = []
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
        if (d < 0.32) edges.push([i, j])
      }
    }
    return { pts, edges }
  }, [seed])

  return (
    <svg
      viewBox="0 0 600 600"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={pts[a].x * 600}
          y1={pts[a].y * 600}
          x2={pts[b].x * 600}
          y2={pts[b].y * 600}
          stroke="var(--line-strong)"
          strokeWidth="0.8"
          opacity="0.6"
        />
      ))}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x * 600}
          cy={p.y * 600}
          r={i % 5 === 0 ? 14 : 7}
          fill={i % 7 === 0 ? 'var(--edge)' : i % 3 === 0 ? 'var(--gx-accent)' : 'var(--bg-elev-2)'}
          stroke={i % 7 === 0 ? 'var(--edge)' : 'var(--gx-accent)'}
          strokeWidth="1"
        />
      ))}
    </svg>
  )
}
