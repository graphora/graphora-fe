'use client'

import { SignUp } from '@clerk/nextjs'
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
      <section
        className="relative flex flex-col justify-between overflow-hidden p-10 lg:p-12"
        style={{
          background: 'var(--bg-deep)',
          borderRight: '1px solid var(--line)',
        }}
      >
        <AmbientGraph density={24} speed={0.8} opacity={0.85} vary={5} />

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

        <div className="relative z-[1] max-w-[480px]">
          <div className="gx-kicker" style={{ marginBottom: 18 }}>
            Get started
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
            Build your first <span style={{ color: 'var(--gx-accent)' }}>knowledge graph</span> in
            minutes.
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
            Spin up a workspace, upload a handful of documents, and watch Graphora stream
            entities and relations into a live, queryable graph.
          </p>
        </div>

        <div
          className="relative z-[1] flex flex-wrap items-center gap-x-6 gap-y-2"
          style={{
            fontFamily: 'var(--font-mono), "IBM Plex Mono", monospace',
            fontSize: 10.5,
            color: 'var(--fg-faint)',
            letterSpacing: '0.08em',
          }}
        >
          <span>FREE FOR SOLO TEAMS</span>
          <span aria-hidden>·</span>
          <span>NO CREDIT CARD</span>
          <span aria-hidden>·</span>
          <span>SELF-HOSTABLE · MIT</span>
        </div>
      </section>

      <section className="flex items-center justify-center p-8 lg:p-10">
        <div className="w-full max-w-[420px] flex flex-col gap-6">
          <div>
            <div className="gx-kicker" style={{ marginBottom: 8 }}>
              Create account
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
              Start building.
            </h2>
            <p style={{ marginTop: 6, fontSize: 13, color: 'var(--fg-muted)' }}>
              Continue with SSO, GitHub, or email.
            </p>
          </div>

          <SignUp appearance={clerkAppearance} />
        </div>
      </section>
    </main>
  )
}
