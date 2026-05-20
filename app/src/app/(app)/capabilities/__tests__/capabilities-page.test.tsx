import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CapabilitiesPage } from '../capabilities-page'

function installFetchMock(
  responder: (
    url: string
  ) => { status: number; body: unknown } | Promise<{ status: number; body: unknown }>
) {
  const spy = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const result = await responder(url)
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.body,
      text: async () => JSON.stringify(result.body),
    } as unknown as Response
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---- Fixtures --------------------------------------------------------

const matrixResponse = {
  backends: [
    {
      name: 'neo4j',
      display_name: 'Neo4j',
      default_capabilities: {
        persistent: true,
        full_text_indexes: true,
        similarity_search: true,
        embedding_similarity: false,
        per_user_routing: true,
      },
      dynamic_flags: [],
      notes: ['Reference backend.'],
      extras: ['neo4j'],
    },
    {
      name: 'postgres',
      display_name: 'Postgres + Apache AGE',
      default_capabilities: {
        persistent: true,
        full_text_indexes: false,
        similarity_search: true,
        embedding_similarity: false,
        per_user_routing: false,
      },
      dynamic_flags: ['full_text_indexes'],
      notes: ['full_text_indexes depends on pg_trgm.'],
      extras: ['age'],
    },
    {
      name: 'memory',
      display_name: 'In-memory (dev/demo)',
      default_capabilities: {
        persistent: false,
        full_text_indexes: false,
        similarity_search: true,
        embedding_similarity: false,
        per_user_routing: false,
      },
      dynamic_flags: [],
      notes: ['Dev/demo only.'],
      extras: [],
    },
  ],
}

// ---- Tests --------------------------------------------------------

describe('CapabilitiesPage', () => {
  it('fetches /api/capabilities/matrix on mount', async () => {
    const spy = installFetchMock(() => ({
      status: 200,
      body: matrixResponse,
    }))
    render(<CapabilitiesPage />)
    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })
    expect(spy.mock.calls[0][0]).toBe('/api/capabilities/matrix')
  })

  it('renders every backend as a column with display name + STORAGE_TYPE', async () => {
    installFetchMock(() => ({ status: 200, body: matrixResponse }))
    render(<CapabilitiesPage />)

    // Each backend's display name renders in TWO places:
    //   * the matrix table column header (one cell per backend)
    //   * the per-backend detail card below the matrix
    // So ``findByText('Neo4j')`` is ambiguous. Use the
    // STORAGE_TYPE chip — only the table header carries that
    // shape — to anchor a per-backend presence assertion.
    await screen.findByText(/STORAGE_TYPE=neo4j/)
    expect(screen.getByText(/STORAGE_TYPE=postgres/)).toBeInTheDocument()
    expect(screen.getByText(/STORAGE_TYPE=memory/)).toBeInTheDocument()
    // Display names must surface SOMEWHERE — use getAllByText
    // because both the table header and the detail card carry
    // them. The point is "the page knows the backend exists",
    // not "exactly one render."
    expect(screen.getAllByText('Neo4j').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('Postgres + Apache AGE').length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText('In-memory (dev/demo)').length
    ).toBeGreaterThan(0)
  })

  it('renders capability rows from CAPABILITY_LABELS in order', async () => {
    // Reviewer-supportive pin: the wire payload's
    // ``default_capabilities`` is an object (key order isn't
    // semantically meaningful in JSON), so the page can't
    // safely iterate over its keys to render rows. The page
    // imports CAPABILITY_LABELS from types/capabilities.ts —
    // an explicit ordered array — and that's where the
    // row-order contract lives.
    //
    // Pin that the rendered labels appear in the
    // CAPABILITY_LABELS order so a refactor that switches to
    // ``Object.keys(default_capabilities)`` (which would lose
    // the ordering guarantee) regresses here.
    installFetchMock(() => ({ status: 200, body: matrixResponse }))
    render(<CapabilitiesPage />)

    await screen.findByText('Persistence')
    const labels = ['Persistence', 'Full-text indexes', 'Similarity search']
    const rendered = labels.map((label) => screen.getByText(label))
    // Document order: each subsequent label must appear AFTER
    // the previous one in the DOM tree.
    for (let i = 1; i < rendered.length; i++) {
      const prev = rendered[i - 1]
      const cur = rendered[i]
      // Position-based comparison via compareDocumentPosition.
      const result = prev.compareDocumentPosition(cur)
      // 0x04 (DOCUMENT_POSITION_FOLLOWING) means ``cur``
      // comes after ``prev`` in document order.
      expect(result & 0x04).toBeTruthy()
    }
  })

  it('renders dynamic-flag cells with the runtime-detected annotation', async () => {
    // Load-bearing UX pin: the wire's ``dynamic_flags`` array
    // tells the page which cells can't be summarized by a
    // single boolean. The page must surface that — otherwise
    // operators read "false" on AGE's full_text_indexes and
    // miss that the live instance may report True after
    // pg_trgm bootstraps. Pin the asterisk annotation
    // (`false*`) so a regression that drops the dynamic-flag
    // branch (re-rendering as a flat check/X) fails here.
    installFetchMock(() => ({ status: 200, body: matrixResponse }))
    render(<CapabilitiesPage />)

    // The asterisked form surfaces for AGE's
    // full_text_indexes default-False. Use a regex because
    // Rich-style text-only rendering may join surrounding
    // whitespace.
    await screen.findByText(/false\*/)
  })

  it('renders the no-extra badge for memory backend', async () => {
    // Empty extras → "no extra" badge rather than an empty
    // hole in the layout. Pin so a regression that renders
    // ``<></>`` for empty extras (and creates layout
    // inconsistency) regresses here.
    installFetchMock(() => ({ status: 200, body: matrixResponse }))
    render(<CapabilitiesPage />)

    await screen.findByText(/no extra/i)
  })

  it('renders the [age] install hint for the Postgres backend', async () => {
    // Reviewer-flagged fix from commit 941c225: the matrix
    // advertises ``[age]`` (top-level backend extra) NOT
    // ``[postgres]`` (lower-level dep). Pin that the rendered
    // hint carries the correct extras value end-to-end —
    // through the wire, the proxy, and the page render.
    installFetchMock(() => ({ status: 200, body: matrixResponse }))
    render(<CapabilitiesPage />)

    await screen.findByText('[age]')
    // The wrong extras value (``[postgres]``) MUST NOT
    // appear — pin against a regression that picks up the
    // lower-level dep name from somewhere.
    expect(screen.queryByText('[postgres]')).not.toBeInTheDocument()
  })

  it('renders per-backend notes section', async () => {
    installFetchMock(() => ({ status: 200, body: matrixResponse }))
    render(<CapabilitiesPage />)

    expect(
      await screen.findByText('Per-backend details')
    ).toBeInTheDocument()
    expect(screen.getByText(/Reference backend\./)).toBeInTheDocument()
    expect(
      screen.getByText(/full_text_indexes depends on pg_trgm/)
    ).toBeInTheDocument()
  })

  it('surfaces fetch errors with the failure detail', async () => {
    installFetchMock(() => ({
      status: 500,
      body: { error: 'matrix endpoint crashed' },
    }))
    render(<CapabilitiesPage />)

    expect(
      await screen.findByText(/Could not load capability matrix/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/matrix endpoint crashed/i)
    ).toBeInTheDocument()
  })

  it('refetches when the Refresh button is clicked', async () => {
    let callCount = 0
    installFetchMock(() => {
      callCount += 1
      return { status: 200, body: matrixResponse }
    })
    render(<CapabilitiesPage />)

    // Anchor on the STORAGE_TYPE chip (only the table header
    // renders this shape) to avoid the dual-render ambiguity
    // on display names.
    await screen.findByText(/STORAGE_TYPE=neo4j/)
    expect(callCount).toBe(1)

    await userEvent.click(
      screen.getByRole('button', { name: /refresh/i })
    )
    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(2)
    })
  })
})
