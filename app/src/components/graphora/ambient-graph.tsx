'use client'

import * as React from 'react'

type AmbientGraphProps = {
  density?: number
  speed?: number
  opacity?: number
  vary?: number
  className?: string
}

// Simple deterministic seeded RNG — keeps node layouts stable across renders
function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

/**
 * Ambient graph backdrop. Drifting nodes connected by pulsing edges, mask-faded
 * at the edges. Sits behind page content as a `position: absolute; inset: 0`
 * layer and should be rendered inside a `position: relative` container.
 */
export function AmbientGraph({
  density = 18,
  speed = 0.4,
  opacity = 0.18,
  vary = 0,
  className,
}: AmbientGraphProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ w: 1200, h: 800 })
  const [t, setT] = React.useState(0)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof ResizeObserver === 'undefined') {
      // SSR / jsdom fallback — measure once synchronously.
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(200, r.width || 1200), h: Math.max(200, r.height || 800) })
      return
    }
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const nodes = React.useMemo(() => {
    const r = rng(42 + vary * 17)
    return Array.from({ length: density }, (_, i) => ({
      i,
      x: r(),
      y: r(),
      s: 0.5 + r() * 1.3,
      a: r() * Math.PI * 2,
      d: 0.3 + r() * 0.7,
      type: r() > 0.82 ? ('alt' as const) : ('on' as const),
    }))
  }, [density, vary])

  const edges = React.useMemo(() => {
    const list: [number, number][] = []
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const nearest = nodes
        .map((m, j) => ({ j, d: (n.x - m.x) ** 2 + (n.y - m.y) ** 2 }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
      for (const e of nearest) {
        if (e.d < 0.04) list.push([i, e.j])
      }
    }
    return list
  }, [nodes])

  React.useEffect(() => {
    // Respect prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      setT(((now - start) / 1000) * speed)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [speed])

  const { w, h } = size

  const pos = (n: { x: number; y: number; a: number; d: number }) => {
    const dx = Math.sin(t * 0.3 + n.a) * 14 * n.d
    const dy = Math.cos(t * 0.25 + n.a * 1.3) * 14 * n.d
    return { x: n.x * w + dx, y: n.y * h + dy }
  }

  return (
    <div ref={ref} className={`gx-bg-motif ${className ?? ''}`} style={{ opacity }} aria-hidden="true">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <radialGradient id="ambient-fade-out">
            <stop offset="0" stopColor="white" stopOpacity="1" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="ambient-fade-mask">
            <rect width={w} height={h} fill="url(#ambient-fade-out)" />
          </mask>
        </defs>
        <g mask="url(#ambient-fade-mask)">
          {edges.map(([a, b], k) => {
            const pa = pos(nodes[a])
            const pb = pos(nodes[b])
            const pulse = (Math.sin(t * 1.2 + k) + 1) / 2
            return (
              <line
                key={k}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke="var(--line-strong)"
                strokeWidth={0.6 + pulse * 0.6}
                opacity={0.25 + pulse * 0.25}
              />
            )
          })}
          {nodes.map((n, k) => {
            const p = pos(n)
            const breathe = 1 + Math.sin(t * 0.8 + n.a) * 0.15
            const color = n.type === 'alt' ? 'var(--edge)' : 'var(--gx-accent)'
            return (
              <g key={k}>
                <circle cx={p.x} cy={p.y} r={n.s * 8 * breathe} fill={color} opacity={0.12} />
                <circle cx={p.x} cy={p.y} r={n.s * 2.3} fill={color} opacity={0.7} />
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
