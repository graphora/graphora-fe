'use client'

import { SignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AmbientGraph, BrandMark } from '@/components/graphora'
import { clerkAppearance } from '@/lib/clerk-appearance'

const isAuthBypassEnabled = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    if (isAuthBypassEnabled) {
      router.replace('/dashboard')
    }
  }, [router])

  if (isAuthBypassEnabled) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'rgb(var(--background))' }}
      >
        <p style={{ color: 'var(--fg-muted)' }}>Redirecting…</p>
      </main>
    )
  }

  return (
    <main
      className="grid min-h-screen grid-cols-1 lg:grid-cols-2"
      style={{ background: 'rgb(var(--background))' }}
    >
      {/* Left: brand + hero with ambient graph backdrop */}
      <section
        className="relative flex flex-col justify-between overflow-hidden p-10 lg:p-12"
        style={{
          background: 'var(--bg-deep)',
          borderRight: '1px solid var(--line)',
        }}
      >
        <AmbientGraph density={24} speed={0.8} opacity={0.85} vary={3} />

        {/* Brand */}
        <div className="relative z-[1] flex items-center gap-[10px]">
          <span style={{ width: 26, height: 26, display: 'grid', placeItems: 'center' }}>
            <BrandMark size={26} />
          </span>
          <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em' }}>
            Graphora
          </span>
          <span style={{ color: 'var(--fg-faint)', fontSize: 12 }}>
            / knowledge graph platform
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative z-[1] max-w-[480px]">
          <div className="gx-kicker" style={{ marginBottom: 18 }}>
            Graph · Ontology · Transform
          </div>
          <h1
            style={{
              fontSize: 'clamp(28px, 3.5vw, 38px)',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              color: 'var(--fg)',
            }}
          >
            Turn unstructured documents into{' '}
            <span style={{ color: 'var(--gx-accent)' }}>queryable knowledge graphs</span>.
          </h1>
          <p
            style={{
              marginTop: 18,
              fontSize: 14,
              maxWidth: 420,
              lineHeight: 1.6,
              color: 'var(--fg-muted)',
            }}
          >
            A hybrid ontology workbench for technical teams — author schemas visually or in
            YAML, transform streams of documents, and reconcile the graph with built-in
            conflict resolution.
          </p>
        </div>

        {/* Tagline / feature tags */}
        <div
          className="relative z-[1] flex flex-wrap items-center gap-x-6 gap-y-2"
          style={{
            fontFamily: 'var(--font-mono), "IBM Plex Mono", monospace',
            fontSize: 10.5,
            color: 'var(--fg-faint)',
            letterSpacing: '0.08em',
          }}
        >
          <span>MIT LICENSED</span>
          <span aria-hidden>·</span>
          <span>TYPE-SAFE</span>
          <span aria-hidden>·</span>
          <span>SOCKET.IO REAL-TIME</span>
          <span aria-hidden>·</span>
          <span>NEO4J + REACTFLOW</span>
        </div>
      </section>

      {/* Right: Clerk sign-in form */}
      <section className="flex items-center justify-center p-8 lg:p-10">
        <div className="w-full max-w-[420px] flex flex-col gap-6">
          <div>
            <div className="gx-kicker" style={{ marginBottom: 8 }}>
              Sign in
            </div>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
                lineHeight: 1.2,
              }}
            >
              Welcome back.
            </h2>
            <p style={{ marginTop: 6, fontSize: 13, color: 'var(--fg-muted)' }}>
              Continue to your workspace. Single sign-on via your identity provider.
            </p>
          </div>

          <SignIn appearance={clerkAppearance} />
        </div>
      </section>
    </main>
  )
}
