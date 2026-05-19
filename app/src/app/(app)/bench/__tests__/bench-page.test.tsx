import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BenchPage } from '../bench-page'

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

// ---- Fixtures --------------------------------------------------------

const emptyExtractorReport = {
  corpus_size: 50,
  extractor_count: 0,
  extractors: [],
}

const noCorpusReport = {
  corpus_size: 0,
  extractor_count: 0,
  extractors: [],
}

function _entry(overrides: {
  corpus_slug: string
  node_f1?: number
  edge_f1?: number
  error?: string | null
}) {
  return {
    corpus_slug: overrides.corpus_slug,
    node_precision: overrides.node_f1 ?? 0,
    node_recall: overrides.node_f1 ?? 0,
    node_f1: overrides.node_f1 ?? 0,
    edge_precision: overrides.edge_f1 ?? 0,
    edge_recall: overrides.edge_f1 ?? 0,
    edge_f1: overrides.edge_f1 ?? 0,
    node_true_positives: overrides.error ? 0 : 5,
    node_false_positives: 0,
    node_false_negatives: 0,
    edge_true_positives: overrides.error ? 0 : 3,
    edge_false_positives: 0,
    edge_false_negatives: 0,
    error: overrides.error ?? null,
  }
}

const fullReport = {
  corpus_size: 3,
  extractor_count: 2,
  extractors: [
    {
      extractor_name: 'graphora',
      total_entries: 3,
      scored_count: 3,
      errored_count: 0,
      micro_node_precision: 0.85,
      micro_node_recall: 0.92,
      micro_node_f1: 0.884,
      micro_edge_precision: 0.78,
      micro_edge_recall: 0.81,
      micro_edge_f1: 0.795,
      macro_node_f1: 0.871,
      macro_edge_f1: 0.802,
      entries: [
        _entry({ corpus_slug: 'alpha', node_f1: 1.0 }),
        _entry({ corpus_slug: 'beta', node_f1: 0.75 }),
        _entry({ corpus_slug: 'gamma', node_f1: 0.86 }),
      ],
    },
    {
      extractor_name: 'competitor_x',
      total_entries: 3,
      scored_count: 2,
      errored_count: 1,
      micro_node_precision: 0.6,
      micro_node_recall: 0.5,
      micro_node_f1: 0.545,
      micro_edge_precision: 0.5,
      micro_edge_recall: 0.4,
      micro_edge_f1: 0.444,
      macro_node_f1: 0.55,
      macro_edge_f1: 0.45,
      entries: [
        _entry({ corpus_slug: 'alpha', node_f1: 0.55 }),
        _entry({ corpus_slug: 'beta', node_f1: 0.55 }),
        _entry({
          corpus_slug: 'gamma',
          error: 'missing actual output at gamma.json',
        }),
      ],
    },
  ],
}

// ---- Tests --------------------------------------------------------

describe('BenchPage', () => {
  it('fetches /api/bench/run on mount', async () => {
    const spy = installFetchMock(() => ({
      status: 200,
      body: emptyExtractorReport,
    }))
    render(<BenchPage />)
    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })
    expect(spy.mock.calls[0][0]).toBe('/api/bench/run')
  })

  it('renders the no-extractors state when corpus_size > 0 but extractor_count === 0', async () => {
    // The load-bearing distinction: corpus exists but no
    // extractor outputs committed. Mirrors the contradictions
    // tab's three-empty-state pattern.
    installFetchMock(() => ({
      status: 200,
      body: emptyExtractorReport,
    }))
    render(<BenchPage />)

    expect(
      await screen.findByText(/No extractor outputs committed/i)
    ).toBeInTheDocument()
    // Points the operator at the README workflow.
    expect(screen.getByText(/bench\/README\.md/)).toBeInTheDocument()
    // Should NOT render the no-corpus state (different message).
    expect(
      screen.queryByText(/No golden corpus discovered/i)
    ).not.toBeInTheDocument()
  })

  it('renders the no-corpus state when corpus_size === 0', async () => {
    installFetchMock(() => ({ status: 200, body: noCorpusReport }))
    render(<BenchPage />)

    expect(
      await screen.findByText(/No golden corpus discovered/i)
    ).toBeInTheDocument()
  })

  it('renders extractor rows with headline F1 and coverage badge', async () => {
    installFetchMock(() => ({ status: 200, body: fullReport }))
    render(<BenchPage />)

    // Both extractor names visible.
    expect(await screen.findByText('graphora')).toBeInTheDocument()
    expect(screen.getByText('competitor_x')).toBeInTheDocument()
    // Default headline is micro. graphora micro_node_f1 = 0.884.
    expect(screen.getByText('0.884')).toBeInTheDocument()
    // competitor_x has 1 errored entry — coverage badge surfaces
    // the count visibly rather than collapsing into a single
    // "N of M" number.
    expect(screen.getByText(/1 errored/i)).toBeInTheDocument()
  })

  it('toggles headline between micro and macro', async () => {
    // Reviewer-supportive pin: the API exposes BOTH micro and
    // macro F1 deliberately because they answer different
    // questions. The page's primary column has to commit to one;
    // the toggle lets the operator pick. Pin that switching the
    // toggle actually moves the displayed numbers.
    installFetchMock(() => ({ status: 200, body: fullReport }))
    render(<BenchPage />)

    // Default = micro. graphora's micro_node_f1 = 0.884.
    await screen.findByText('0.884')
    // After toggling to macro, the headline number becomes
    // 0.871 (graphora.macro_node_f1).
    await userEvent.click(screen.getByRole('button', { name: /^macro$/i }))
    await screen.findByText('0.871')
  })

  it('expands an extractor card to show per-entry detail with errored row', async () => {
    installFetchMock(() => ({ status: 200, body: fullReport }))
    render(<BenchPage />)

    // Click the expand toggle on competitor_x (which has the
    // errored gamma entry).
    const competitorButton = await screen.findByRole('button', {
      name: /competitor_x/,
    })
    await userEvent.click(competitorButton)

    // Per-entry table is now visible. Look for the errored
    // entry's message — pin that errored rows surface their
    // reason rather than collapsing into a zero F1 row.
    expect(
      await screen.findByText(/missing actual output at gamma.json/i)
    ).toBeInTheDocument()
  })

  it('surfaces errored_count even when scored_count is zero', async () => {
    // Reviewer-flagged Medium on commit c304e06: pre-fix the
    // ``scored === 0`` branch short-circuited the CoverageBadge
    // and returned ``0 / 50`` without ever consulting
    // errored_count. A totally-broken extractor (every entry
    // errored) was visually indistinguishable from one with
    // no committed outputs.
    //
    // The wire contract makes ``errored_count`` required-not-
    // optional precisely so this distinction is preserved — the
    // UI has to honor it. Fixture: scored_count: 0, errored_count
    // matches corpus_size (every entry failed). Pin that the
    // badge surfaces both numbers, so an operator can tell
    // "extractor crashed on everything" from "no outputs
    // committed yet."
    const totallyBroken = {
      corpus_size: 3,
      extractor_count: 1,
      extractors: [
        {
          extractor_name: 'broken_extractor',
          total_entries: 3,
          scored_count: 0,
          errored_count: 3,
          micro_node_precision: 0,
          micro_node_recall: 0,
          micro_node_f1: 0,
          micro_edge_precision: 0,
          micro_edge_recall: 0,
          micro_edge_f1: 0,
          macro_node_f1: 0,
          macro_edge_f1: 0,
          entries: [
            _entry({
              corpus_slug: 'alpha',
              error: 'missing actual output at alpha.json',
            }),
            _entry({
              corpus_slug: 'beta',
              error: 'missing actual output at beta.json',
            }),
            _entry({
              corpus_slug: 'gamma',
              error: 'missing actual output at gamma.json',
            }),
          ],
        },
      ],
    }
    installFetchMock(() => ({ status: 200, body: totallyBroken }))
    render(<BenchPage />)

    // The badge text must include the errored count, NOT just
    // "0 / 3". This is the load-bearing assertion: a regression
    // that re-introduces the short-circuit would fail here.
    await screen.findByText('broken_extractor')
    expect(screen.getByText(/0 \/ 3 · 3 errored/)).toBeInTheDocument()
  })

  it('surfaces fetch errors with the failure detail', async () => {
    installFetchMock(() => ({
      status: 500,
      body: { error: 'bench runner crashed' },
    }))
    render(<BenchPage />)

    expect(
      await screen.findByText(/Could not load bench report/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/bench runner crashed/i)
    ).toBeInTheDocument()
  })

  it('refetches when the Refresh button is clicked', async () => {
    let callCount = 0
    installFetchMock(() => {
      callCount += 1
      return { status: 200, body: emptyExtractorReport }
    })
    render(<BenchPage />)
    await screen.findByText(/No extractor outputs committed/i)
    expect(callCount).toBe(1)

    await userEvent.click(
      screen.getByRole('button', { name: /refresh/i })
    )
    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(2)
    })
  })
})
