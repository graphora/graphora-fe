import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ContradictionsTab } from '../contradictions-tab'

// ---- Test fixtures --------------------------------------------------------

/** Helper: build a Claim with sensible defaults. */
function claim(overrides: {
  id: string
  value: unknown
  confidence: number
  target_id?: string
  target_kind?: 'node' | 'edge'
  property_key?: string
  source_chunk_id?: string | null
  source_extractor_model?: string | null
}) {
  return {
    id: overrides.id,
    transform_id: 'tx-1',
    target_id: overrides.target_id ?? 'cid-alice',
    target_kind: overrides.target_kind ?? 'node',
    property_key: overrides.property_key ?? 'title',
    value: overrides.value,
    confidence: overrides.confidence,
    source_chunk_id: overrides.source_chunk_id ?? 'chunk-1',
    source_extractor_model:
      overrides.source_extractor_model ?? 'gemini-2.5-flash',
    source_prompt_version: 'v1.0',
    user_id: 'user-1',
    created_at: null,
  }
}

const nodeContradictionResponse = {
  transform_id: 'tx-1',
  min_confidence: 0.0,
  contradictions: [
    {
      target_id: 'cid-alice',
      target_kind: 'node' as const,
      property_key: 'title',
      severity: 2,
      competing_claims: [
        claim({ id: 'c1', value: 'Senior Engineer', confidence: 0.9 }),
        claim({
          id: 'c2',
          value: 'Engineer',
          confidence: 0.7,
          source_chunk_id: 'chunk-2',
        }),
      ],
    },
  ],
  total_claims_scanned: 42,
}

const edgeContradictionResponse = {
  transform_id: 'tx-1',
  min_confidence: 0.0,
  contradictions: [
    {
      target_id: 'cid-alice|WORKS_AT|cid-acme',
      target_kind: 'edge' as const,
      property_key: 'role',
      severity: 2,
      competing_claims: [
        claim({
          id: 'c-edge-1',
          value: 'Senior Engineer',
          confidence: 0.95,
          target_id: 'cid-alice|WORKS_AT|cid-acme',
          target_kind: 'edge',
          property_key: 'role',
        }),
        claim({
          id: 'c-edge-2',
          value: 'Engineer',
          confidence: 0.6,
          target_id: 'cid-alice|WORKS_AT|cid-acme',
          target_kind: 'edge',
          property_key: 'role',
          source_chunk_id: 'chunk-2',
        }),
      ],
    },
  ],
  total_claims_scanned: 10,
}

const noClaimsResponse = {
  transform_id: 'tx-1',
  min_confidence: 0.0,
  contradictions: [],
  total_claims_scanned: 0,
}

const cleanResponse = {
  transform_id: 'tx-1',
  min_confidence: 0.0,
  contradictions: [],
  total_claims_scanned: 100,
}

// ---- Fetch mocking --------------------------------------------------------

function installFetchMock(
  responder: (
    url: string
  ) => { status: number; body: unknown } | Promise<{ status: number; body: unknown }>
) {
  const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const result = await responder(url)
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.body,
      text: async () => JSON.stringify(result.body),
    } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---- Tests ----------------------------------------------------------------

describe('ContradictionsTab', () => {
  it('fetches from the proxy route on mount', async () => {
    const fetchSpy = installFetchMock(() => ({
      status: 200,
      body: noClaimsResponse,
    }))
    render(<ContradictionsTab transformId="tx-1" />)
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled()
    })
    expect(fetchSpy.mock.calls[0][0]).toBe(
      '/api/graph/tx-1/contradictions'
    )
  })

  it('renders the no-claims state when total_claims_scanned is 0', async () => {
    // Reviewer-flagged Medium on the slice 2a backend pinned
    // ``total_claims_scanned`` precisely so this UI surface
    // could tell apart "no writer yet" from "writer healthy,
    // consistent data" — pin the distinction here so a
    // refactor that collapses both states regresses noisily.
    installFetchMock(() => ({ status: 200, body: noClaimsResponse }))
    render(<ContradictionsTab transformId="tx-1" />)

    expect(
      await screen.findByText(/No claims emitted yet/i)
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/All claims agree/i)
    ).not.toBeInTheDocument()
  })

  it('renders the clean state when claims exist but no contradictions', async () => {
    installFetchMock(() => ({ status: 200, body: cleanResponse }))
    render(<ContradictionsTab transformId="tx-1" />)

    const message = await screen.findByText(/All claims agree/i)
    // The message body mentions the scanned count so the operator
    // can verify the writer is functioning, not just see a
    // generic "looks good" panel. Scope the count lookup to the
    // empty-state paragraph since "100" also appears in the
    // SummaryRow above — both renders are correct; the test just
    // needs to assert the count is in the explanatory text.
    const card = message.closest('div')!.parentElement!
    expect(within(card).getByText(/100/)).toBeInTheDocument()
    expect(
      screen.queryByText(/No claims emitted yet/i)
    ).not.toBeInTheDocument()
  })

  it('renders a node contradiction with competing claims sorted by confidence', async () => {
    installFetchMock(() => ({
      status: 200,
      body: nodeContradictionResponse,
    }))
    render(<ContradictionsTab transformId="tx-1" />)

    // The contradiction's property_key is visible.
    expect(await screen.findByText('title')).toBeInTheDocument()
    // Both competing values appear.
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument()
    expect(screen.getByText('Engineer')).toBeInTheDocument()
    // Confidences render formatted.
    expect(screen.getByText('0.90')).toBeInTheDocument()
    expect(screen.getByText('0.70')).toBeInTheDocument()
    // Severity badge shows distinct-value count.
    expect(screen.getByText(/2 distinct values/i)).toBeInTheDocument()
  })

  it('decomposes an edge target_id into source → type → target', async () => {
    // The slice 2b-edge writer assembles edge target_ids as
    // ``src_cid|TYPE|tgt_cid`` so the UI can split and pretty-
    // render. Pin that the tab actually does the split — a
    // refactor that renders the raw pipe-string would regress
    // here.
    installFetchMock(() => ({
      status: 200,
      body: edgeContradictionResponse,
    }))
    render(<ContradictionsTab transformId="tx-1" />)

    // The edge type renders as its own badge (not part of the
    // raw target_id string).
    expect(await screen.findByText('WORKS_AT')).toBeInTheDocument()
    // The raw pipe-delimited string MUST NOT appear in the
    // rendered output — that would mean the decompose helper
    // didn't run.
    expect(
      screen.queryByText('cid-alice|WORKS_AT|cid-acme')
    ).not.toBeInTheDocument()
    // The "edge" kind badge surfaces too.
    expect(screen.getByText('edge')).toBeInTheDocument()
  })

  it('renders an edge contradiction whose target_id does not decompose', async () => {
    // Graceful-degrade case: when the slice 2b-edge writer can't
    // resolve canonical_ids it falls back to ``edge.id`` as a
    // raw string. The UI should render whatever the writer gave
    // it without crashing on the split — pin that the fallback
    // path works.
    const fallbackResponse = {
      ...edgeContradictionResponse,
      contradictions: [
        {
          ...edgeContradictionResponse.contradictions[0],
          target_id: 'per-chunk-edge-uuid',
        },
      ],
    }
    installFetchMock(() => ({ status: 200, body: fallbackResponse }))
    render(<ContradictionsTab transformId="tx-1" />)

    // The raw fallback id renders as-is when it doesn't have
    // the 3-part pipe shape.
    expect(
      await screen.findByText('per-chunk-edge-uuid')
    ).toBeInTheDocument()
  })

  it('surfaces an error message when the fetch fails', async () => {
    installFetchMock(() => ({
      status: 500,
      body: { error: 'claims store down' },
    }))
    render(<ContradictionsTab transformId="tx-1" />)

    expect(
      await screen.findByText(/Could not load contradictions/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/claims store down/i)
    ).toBeInTheDocument()
  })

  it('refetches when the Refresh button is clicked', async () => {
    let callCount = 0
    const fetchSpy = installFetchMock(() => {
      callCount += 1
      return { status: 200, body: cleanResponse }
    })
    render(<ContradictionsTab transformId="tx-1" />)

    await screen.findByText(/All claims agree/i)
    expect(callCount).toBe(1)

    await userEvent.click(
      screen.getByRole('button', { name: /refresh/i })
    )

    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(2)
    })
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('shows the summary stats from the wire envelope', async () => {
    installFetchMock(() => ({
      status: 200,
      body: nodeContradictionResponse,
    }))
    render(<ContradictionsTab transformId="tx-1" />)

    // total_claims_scanned visible as its own stat.
    expect(await screen.findByText('42')).toBeInTheDocument()
    // The "Claims scanned" label is unique to the summary card
    // (the heading uses "Contradictions"); use it as an anchor
    // to scope the "1" lookup, since "1" might appear elsewhere
    // (e.g., as a severity count in some renderings).
    const claimsScannedLabel = screen.getByText(/Claims scanned/i)
    const summaryCard = claimsScannedLabel.closest('div')!.parentElement!
      .parentElement!
    expect(within(summaryCard).getByText('1')).toBeInTheDocument()
    expect(within(summaryCard).getByText('42')).toBeInTheDocument()
  })
})
