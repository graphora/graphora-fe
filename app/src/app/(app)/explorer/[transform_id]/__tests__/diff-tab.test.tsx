import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DiffTab } from '../diff-tab'

// ---- Test fixtures --------------------------------------------------------

const runsResponse = {
  items: [
    {
      transform_id: 'tx-base',
      document_name: 'paper-v1.pdf',
      processing_completed_at: '2026-04-01T10:00:00Z',
    },
    {
      transform_id: 'tx-compare', // current transform — must be filtered out
      document_name: 'paper-v2.pdf',
      processing_completed_at: '2026-05-01T10:00:00Z',
    },
  ],
}

// Reviewer-flagged P2 on commit 4ce2fe2: the prior fixture used a
// flat ``summary.nodes_added`` shape mirroring the server's
// internal dataclass. The actual WIRE shape is nested
// (``summary.nodes.added``) — see graphora_server/api/graph.py's
// _diff_to_dict serializer. Tests now match the contract that
// real HTTP responses use, so a future change to the serializer
// fails loud here.
const diffResponse = {
  base_transform_id: 'tx-base',
  compare_transform_id: 'tx-compare',
  summary: {
    nodes: { added: 2, removed: 1, changed: 1, unchanged: 7 },
    edges: { added: 1, removed: 0, changed: 0, unchanged: 4 },
  },
  added_nodes: [
    {
      id: 'n-new-1',
      label: 'Bob',
      type: 'Person',
      properties: {},
    },
    {
      id: 'n-new-2',
      label: 'Carol',
      type: 'Person',
      properties: {},
    },
  ],
  removed_nodes: [
    {
      id: 'n-old',
      label: 'OldCo',
      type: 'Organization',
      properties: {},
    },
  ],
  changed_nodes: [
    {
      canonical_id: 'canon-alice',
      type: 'Person',
      base_id: 'n-alice-old',
      compare_id: 'n-alice-new',
      property_changes: {
        title: { base: 'Engineer', compare: 'Senior Engineer' },
      },
    },
  ],
  added_edges: [
    {
      id: 'e-new',
      source: 'n-new-1',
      target: 'n-new-2',
      type: 'KNOWS',
    },
  ],
  removed_edges: [],
  changed_edges: [],
}

// ---- Fetch mocking --------------------------------------------------------
//
// The DiffTab fires fetches at mount (dashboard/runs) and on picker
// change (/api/graph/{base}/diff/{compare}). We stub global fetch
// rather than mocking a library so the test exercises the same
// JSON-parse / status-code branching the real component runs.

function installFetchMock(
  responder: (url: string) => { status: number; body: unknown } | Promise<{ status: number; body: unknown }>
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

describe('DiffTab', () => {
  it('renders the empty state when no base has been picked yet', async () => {
    installFetchMock(() => ({ status: 200, body: runsResponse }))
    render(<DiffTab transformId="tx-compare" />)

    // The picker placeholder is visible.
    expect(
      await screen.findByText(/Select base transform/i)
    ).toBeInTheDocument()
    // Empty-state message is visible.
    expect(
      screen.getByText(/Select a base transform from the picker/i)
    ).toBeInTheDocument()
  })

  it('filters the current transform out of the picker', async () => {
    installFetchMock(() => ({ status: 200, body: runsResponse }))
    render(<DiffTab transformId="tx-compare" />)

    // Open the select to populate the items in the DOM.
    const trigger = await screen.findByRole('combobox')
    await userEvent.click(trigger)

    // paper-v1.pdf (tx-base) is offered; paper-v2.pdf (tx-compare,
    // the current transform) is filtered out — diffing a transform
    // against itself is meaningless.
    expect(await screen.findByText('paper-v1.pdf')).toBeInTheDocument()
    expect(screen.queryByText('paper-v2.pdf')).not.toBeInTheDocument()
  })

  it('runs the diff after a base is picked and renders summary + sections', async () => {
    const fetchSpy = installFetchMock((url) => {
      if (url.includes('/api/dashboard/runs')) {
        return { status: 200, body: runsResponse }
      }
      if (url.includes('/diff/')) {
        return { status: 200, body: diffResponse }
      }
      return { status: 404, body: { error: 'not found' } }
    })

    render(<DiffTab transformId="tx-compare" />)

    const trigger = await screen.findByRole('combobox')
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByText('paper-v1.pdf'))

    // Wait for the diff fetch to land. The fetch is now called
    // with an AbortSignal as the second arg (stale-response guard
    // from commit-pending), so assert on the URL via the call
    // list rather than expecting a one-arg call.
    await waitFor(() => {
      const diffCall = fetchSpy.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].includes('/diff/')
      )
      expect(diffCall?.[0]).toBe('/api/graph/tx-base/diff/tx-compare')
    })

    // Summary counts surface.
    expect(await screen.findByText('Summary')).toBeInTheDocument()
    const summaryCard = screen.getByText('Summary').closest('div')!.parentElement!

    // Use within to scope: the section badges also show counts, so
    // we look for "Nodes added" specifically with its 2 inside the
    // summary card.
    expect(within(summaryCard).getByText('Nodes added')).toBeInTheDocument()
    expect(within(summaryCard).getByText('2')).toBeInTheDocument()

    // Section headers visible for non-empty groups.
    expect(screen.getByText('Added nodes')).toBeInTheDocument()
    expect(screen.getByText('Removed nodes')).toBeInTheDocument()
    expect(screen.getByText('Changed nodes')).toBeInTheDocument()
    expect(screen.getByText('Added edges')).toBeInTheDocument()
    // Empty sections still appear (collapsed) — pin their presence
    // so a future refactor that hides them is intentional.
    expect(screen.getByText('Removed edges')).toBeInTheDocument()
    expect(screen.getByText('Changed edges')).toBeInTheDocument()

    // Added node labels visible.
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
    // Removed node visible.
    expect(screen.getByText('OldCo')).toBeInTheDocument()
    // Property-level change for the changed node visible.
    expect(screen.getByText('Engineer')).toBeInTheDocument()
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument()
  })

  it('surfaces a friendly message on 413 truncation', async () => {
    installFetchMock((url) => {
      if (url.includes('/api/dashboard/runs')) {
        return { status: 200, body: runsResponse }
      }
      return {
        status: 413,
        body: { error: 'Transform too large' },
      }
    })

    render(<DiffTab transformId="tx-compare" />)
    const trigger = await screen.findByRole('combobox')
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByText('paper-v1.pdf'))

    // The 413-specific message mentions the 10k-node limit so the
    // user can act on it (split into smaller transforms) rather
    // than seeing a generic "server error."
    expect(
      await screen.findByText(/over 10k nodes/i)
    ).toBeInTheDocument()
  })

  it('shows the picker error inline when runs cannot be fetched', async () => {
    installFetchMock(() => ({
      status: 500,
      body: { error: 'runs unavailable' },
    }))
    render(<DiffTab transformId="tx-compare" />)

    expect(
      await screen.findByText(/Failed to load runs/i)
    ).toBeInTheDocument()
  })

  it('renders summary counts from the nested wire shape', async () => {
    // Reviewer-flagged P2 pin: walk the SAME path the live API
    // returns. If the SummaryCard regresses to reading flat
    // ``summary.nodes_added``, the counts render as "undefined"
    // and this assertion fires.
    installFetchMock((url) => {
      if (url.includes('/api/dashboard/runs')) {
        return { status: 200, body: runsResponse }
      }
      if (url.includes('/diff/')) {
        return { status: 200, body: diffResponse }
      }
      return { status: 404, body: { error: 'not found' } }
    })

    const { container } = render(<DiffTab transformId="tx-compare" />)
    const trigger = await screen.findByRole('combobox')
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByText('paper-v1.pdf'))

    await screen.findByText('Summary')

    // The 2x4 grid renders eight stat values. Pin the most
    // distinctive ones — 7 (nodes unchanged) and 4 (edges
    // unchanged) — so a "0" everywhere fallback (the
    // shape-mismatch failure mode) fails this assertion.
    const summaryHeading = screen.getByText('Summary')
    const summaryCard = summaryHeading.parentElement!.parentElement!
    expect(within(summaryCard).getByText('7')).toBeInTheDocument()
    expect(within(summaryCard).getByText('4')).toBeInTheDocument()
    // Defensive: the literal string "undefined" must not appear
    // anywhere in the rendered card. Pre-fix it did, because
    // ``summary.nodes_added`` resolved to undefined and React
    // rendered the value as text in the SummaryStat span.
    expect(container.textContent).not.toContain('undefined')
  })

  it('keeps the latest base when an earlier slow request resolves out of order', async () => {
    // Race-condition pin: pick base A, then immediately pick base
    // B while A's diff is still in flight. A's response arrives
    // LAST (slow); the UI must show B's result, not A's.
    //
    // Pre-fix repro: runDiff unconditionally setDiff'd whatever
    // response resolved last, so a slow earlier request would
    // overwrite the freshly-selected base. After the fix, the
    // in-flight ref + AbortController combo drops stale
    // resolutions BEFORE they write to state.
    const runsCallsResolved: Array<() => void> = []
    const responders: Record<string, () => Promise<{ status: number; body: unknown }>> = {
      'tx-A': () =>
        new Promise((resolve) => {
          runsCallsResolved.push(() =>
            resolve({
              status: 200,
              body: {
                ...diffResponse,
                base_transform_id: 'tx-A',
                summary: {
                  nodes: { added: 99, removed: 0, changed: 0, unchanged: 0 },
                  edges: { added: 0, removed: 0, changed: 0, unchanged: 0 },
                },
              },
            })
          )
        }),
      'tx-B': () =>
        Promise.resolve({
          status: 200,
          body: {
            ...diffResponse,
            base_transform_id: 'tx-B',
            summary: {
              nodes: { added: 11, removed: 0, changed: 0, unchanged: 0 },
              edges: { added: 0, removed: 0, changed: 0, unchanged: 0 },
            },
          },
        }),
    }

    installFetchMock(async (url) => {
      if (url.includes('/api/dashboard/runs')) {
        return {
          status: 200,
          body: {
            items: [
              {
                transform_id: 'tx-A',
                document_name: 'doc-A.pdf',
                processing_completed_at: '2026-04-01T10:00:00Z',
              },
              {
                transform_id: 'tx-B',
                document_name: 'doc-B.pdf',
                processing_completed_at: '2026-05-01T10:00:00Z',
              },
            ],
          },
        }
      }
      if (url.includes('/diff/')) {
        const match = url.match(/\/api\/graph\/(tx-[AB])\/diff\//)
        const baseId = match?.[1]
        if (baseId && responders[baseId]) {
          return responders[baseId]()
        }
      }
      return { status: 404, body: { error: 'not found' } }
    })

    render(<DiffTab transformId="tx-compare" />)
    const trigger = await screen.findByRole('combobox')

    // Pick A — its diff fetch is held pending by the responders
    // map until we manually resolve it.
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByText('doc-A.pdf'))

    // Pick B before A resolves — this is the race the guard
    // covers.
    await userEvent.click(await screen.findByRole('combobox'))
    await userEvent.click(await screen.findByText('doc-B.pdf'))

    // B's response resolves first (synchronously), then we drop
    // A's pending resolution into the loop.
    await waitFor(() => expect(screen.queryByText('11')).toBeInTheDocument())

    // Now resolve A — pre-fix this would have overwritten B's
    // visible result (99 instead of 11). With the guard, A's
    // response is dropped because its request id is stale.
    runsCallsResolved.forEach((fn) => fn())
    // Yield a tick so any errant setState would flush.
    await new Promise((r) => setTimeout(r, 10))

    // B's count must still be visible; A's must not be.
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.queryByText('99')).not.toBeInTheDocument()
  })
})
