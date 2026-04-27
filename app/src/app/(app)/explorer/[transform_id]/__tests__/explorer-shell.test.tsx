import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock NVL — we don't want the WebGL canvas to instantiate in jsdom.
// graph-tab + schema-tab pull these in via dynamic(), so the mocks
// have to cover both the module path and the dynamic() shape.
vi.mock('@/components/graph-viz', () => ({
  GraphVisualization: (props: { graphData: { nodes: unknown[]; edges: unknown[] } }) => (
    <div data-testid="graph-viz">
      Graph mock: {props.graphData.nodes.length} nodes / {props.graphData.edges.length} edges
    </div>
  ),
}))

vi.mock('@/components/ontology/yaml-editor', () => ({
  YAMLEditor: ({ value, readOnly }: { value: string; readOnly?: boolean }) => (
    <pre data-testid="yaml-editor" data-readonly={String(!!readOnly)}>
      {value}
    </pre>
  ),
}))

import { ExplorerShell } from '../explorer-shell'

const mockGraph = {
  nodes: [
    { id: 'n1', label: 'Alice', type: 'Person', properties: { name: 'Alice' } },
    { id: 'n2', label: 'Acme', type: 'Organization', properties: { name: 'Acme' } },
    { id: 'n3', label: 'Bob', type: 'Person', properties: { name: 'Bob' } },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', type: 'WORKS_AT' },
    { id: 'e2', source: 'n3', target: 'n2', type: 'WORKS_AT' },
  ],
  total_nodes: 3,
  total_edges: 2,
}

const mockOntology = {
  transform_id: 'tx-1',
  ontology_yaml: 'version: "0.1.0"\nentities:\n  Person: {}\n',
  ontology: { entities: { Person: {}, Organization: {} }, relationships: {} },
  stats: { node_count: 3, edge_count: 2, entity_types: 2, relationship_types: 1 },
}

afterEach(() => {
  // Clear vi.stubGlobal between tests; restoreAllMocks doesn't.
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/graph/')) {
        return new Response(JSON.stringify(mockGraph), { status: 200 })
      }
      if (url.includes('/inferred-ontology')) {
        return new Response(JSON.stringify(mockOntology), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    })
  )
})

describe('ExplorerShell', () => {
  it('renders graph counts in the header once loaded', async () => {
    render(<ExplorerShell transformId="tx-1" />)
    // Graph tab is the default — the mocked viz should render with
    // the exact node/edge counts piped through from the fetched data.
    await waitFor(() => {
      expect(screen.getByTestId('graph-viz')).toHaveTextContent(
        '3 nodes / 2 edges'
      )
    })
  })

  it('does not fetch the inferred ontology until Schema tab is opened', async () => {
    const fetchSpy = global.fetch as unknown as ReturnType<typeof vi.fn>
    render(<ExplorerShell transformId="tx-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('graph-viz')).toBeInTheDocument()
    })

    // Inferred-ontology must NOT have been called yet.
    const calls = fetchSpy.mock.calls.map((c) => String(c[0]))
    expect(calls.some((u) => u.includes('/inferred-ontology'))).toBe(false)

    // Open Schema tab.
    await userEvent.click(screen.getByRole('tab', { name: /schema/i }))

    await waitFor(() => {
      expect(screen.getByTestId('yaml-editor')).toBeInTheDocument()
    })
    // Now it should have fired.
    const callsAfter = fetchSpy.mock.calls.map((c) => String(c[0]))
    expect(callsAfter.some((u) => u.includes('/inferred-ontology'))).toBe(true)
  })

  it('shows the editable YAML in the Schema tab', async () => {
    render(<ExplorerShell transformId="tx-1" />)
    await userEvent.click(screen.getByRole('tab', { name: /schema/i }))
    await waitFor(() => {
      const editor = screen.getByTestId('yaml-editor')
      // Schema tab is editable as of the finalize-yaml-body change —
      // YAML is the user's draft, not a frozen read-only display.
      expect(editor).toHaveAttribute('data-readonly', 'false')
      expect(editor).toHaveTextContent('Person')
    })
  })

  it('does NOT re-fetch the ontology when the user toggles back to Schema', async () => {
    const fetchSpy = global.fetch as unknown as ReturnType<typeof vi.fn>
    render(<ExplorerShell transformId="tx-1" />)

    // First Schema activation → one /inferred-ontology call.
    await userEvent.click(screen.getByRole('tab', { name: /schema/i }))
    await waitFor(() => {
      expect(screen.getByTestId('yaml-editor')).toBeInTheDocument()
    })
    const ontoCallsAfterFirstOpen = fetchSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((u) => u.includes('/inferred-ontology'))
    expect(ontoCallsAfterFirstOpen).toHaveLength(1)

    // Toggle Graph → Schema again. Inference must NOT re-fire because
    // the response is cached in the parent state.
    await userEvent.click(screen.getByRole('tab', { name: /graph/i }))
    await userEvent.click(screen.getByRole('tab', { name: /schema/i }))
    await waitFor(() => {
      expect(screen.getByTestId('yaml-editor')).toBeInTheDocument()
    })
    const ontoCallsAfterRevisit = fetchSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((u) => u.includes('/inferred-ontology'))
    expect(ontoCallsAfterRevisit).toHaveLength(1)
  })

  it('only re-fetches the ontology when Re-infer is clicked', async () => {
    const fetchSpy = global.fetch as unknown as ReturnType<typeof vi.fn>
    render(<ExplorerShell transformId="tx-1" />)
    await userEvent.click(screen.getByRole('tab', { name: /schema/i }))
    await waitFor(() => {
      expect(screen.getByTestId('yaml-editor')).toBeInTheDocument()
    })
    expect(
      fetchSpy.mock.calls.filter((c) =>
        String(c[0]).includes('/inferred-ontology')
      )
    ).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: /re-infer/i }))
    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.filter((c) =>
          String(c[0]).includes('/inferred-ontology')
        )
      ).toHaveLength(2)
    })
  })

  it('renders an error panel when the graph fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500 }))
    )
    render(<ExplorerShell transformId="tx-1" />)
    await waitFor(() => {
      // The detail line carries the status code — uniqueness pin so
      // we don't double-match the heading.
      expect(screen.getByText(/Failed to load graph \(500\)/i)).toBeInTheDocument()
    })
  })

  it('refetches when the transformId changes via a key swap', async () => {
    /**
     * Regression for the cross-transform leak. Production code wraps
     * ExplorerShell with `key={transform_id}` in page.tsx so that
     * React remounts the shell on navigation; this test mirrors that
     * pattern to assert the contract holds. Without the key, cached
     * graph data and schema ontology from transform A would survive
     * into transform B.
     */
    const fetchSpy = global.fetch as unknown as ReturnType<typeof vi.fn>

    function Wrapper({ id }: { id: string }) {
      return <ExplorerShell key={id} transformId={id} />
    }

    const { rerender } = render(<Wrapper id="tx-A" />)
    await waitFor(() => {
      expect(screen.getByTestId('graph-viz')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('tab', { name: /schema/i }))
    await waitFor(() => {
      expect(screen.getByTestId('yaml-editor')).toBeInTheDocument()
    })
    const callsForA = fetchSpy.mock.calls.map((c) => String(c[0]))
    expect(
      callsForA.some((u) => u.includes('/api/graph/tx-A'))
    ).toBe(true)
    expect(
      callsForA.some((u) => u.includes('/api/transform/tx-A/inferred-ontology'))
    ).toBe(true)

    // Navigate to a different transform — fresh fetches must fire.
    rerender(<Wrapper id="tx-B" />)
    await waitFor(() => {
      expect(
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
          .map((c) => String(c[0]))
          .some((u) => u.includes('/api/graph/tx-B'))
      ).toBe(true)
    })

    // The Schema tab should have been reset to "first activation"
    // state — open it on the new transform and confirm the new
    // ontology fetch fires.
    await userEvent.click(screen.getByRole('tab', { name: /schema/i }))
    await waitFor(() => {
      expect(
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
          .map((c) => String(c[0]))
          .some((u) =>
            u.includes('/api/transform/tx-B/inferred-ontology')
          )
      ).toBe(true)
    })
  })

  it('Evidence and Export tabs are now interactive (shipped in PR2)', async () => {
    render(<ExplorerShell transformId="tx-1" />)
    await waitFor(() => {
      expect(screen.getByTestId('graph-viz')).toBeInTheDocument()
    })
    const evidence = screen.getByRole('tab', { name: /evidence/i })
    const exportTab = screen.getByRole('tab', { name: /export/i })
    expect(evidence).not.toBeDisabled()
    expect(exportTab).not.toBeDisabled()
  })
})
