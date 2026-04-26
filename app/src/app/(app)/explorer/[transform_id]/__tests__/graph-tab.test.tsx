import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/graph-viz', () => ({
  GraphVisualization: (props: { graphData: { nodes: unknown[]; edges: unknown[] } }) => (
    <div data-testid="graph-viz">
      Graph mock: {props.graphData.nodes.length} nodes / {props.graphData.edges.length} edges
    </div>
  ),
}))

import { GraphTab } from '../graph-tab'

const fixture = {
  nodes: [
    { id: 'n1', label: 'Alice', type: 'Person', properties: {} },
    { id: 'n2', label: 'Bob', type: 'Person', properties: {} },
    { id: 'n3', label: 'Acme', type: 'Organization', properties: {} },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', type: 'KNOWS' },
    { id: 'e2', source: 'n1', target: 'n3', type: 'WORKS_AT' },
  ],
  total_nodes: 3,
  total_edges: 2,
}

describe('GraphTab', () => {
  it('initializes with all node types selected', async () => {
    render(<GraphTab data={fixture} />)
    // All 3 nodes should pass through to the mocked viz.
    expect(await screen.findByTestId('graph-viz')).toHaveTextContent(
      '3 nodes / 2 edges'
    )
  })

  it('preserves the empty type-filter state after the user clicks None', async () => {
    /**
     * Regression for the bug where an init effect ran whenever
     * `activeTypes.size === 0`, silently undoing the user's None
     * click. The filter must respect explicit clears.
     */
    render(<GraphTab data={fixture} />)
    await screen.findByTestId('graph-viz')
    await userEvent.click(screen.getByRole('button', { name: /^None$/i }))

    // No nodes should pass through; the empty-state hint shows
    // instead of GraphVisualization.
    expect(screen.queryByTestId('graph-viz')).not.toBeInTheDocument()
    expect(
      screen.getByText(/No nodes match the current filter/i)
    ).toBeInTheDocument()
  })

  it('filters down to a single type when the user toggles others off', async () => {
    render(<GraphTab data={fixture} />)
    await screen.findByTestId('graph-viz')

    // Click Organization chip to deactivate it; only Persons remain.
    await userEvent.click(screen.getByRole('button', { name: 'Organization' }))

    // 2 Person nodes survive; the e1 (Person → Person) edge remains,
    // e2 is dropped because n3 is filtered out.
    expect(await screen.findByTestId('graph-viz')).toHaveTextContent(
      '2 nodes / 1 edges'
    )
  })

  it('All button reselects every type after a None', async () => {
    render(<GraphTab data={fixture} />)
    await screen.findByTestId('graph-viz')

    await userEvent.click(screen.getByRole('button', { name: /^None$/i }))
    expect(screen.queryByTestId('graph-viz')).not.toBeInTheDocument()

    // After clearing, the button label flips to "All". Clicking it
    // restores the full set.
    await userEvent.click(screen.getByRole('button', { name: /^All$/i }))
    expect(await screen.findByTestId('graph-viz')).toHaveTextContent(
      '3 nodes / 2 edges'
    )
  })

  it('resets default-all selection when the GraphTab is keyed by transform', async () => {
    /**
     * Regression for the cross-transform filter leak. The
     * filterInitialized ref makes sense within a single Explorer
     * lifetime — but if the Explorer shell is reused across
     * transforms the previous selection bleeds in and can leave the
     * new graph filtered to zero nodes. Production keys ExplorerShell
     * by transformId in page.tsx, which propagates remount to
     * GraphTab. Mirror that contract here: a key-swap must restore
     * "all types selected" defaults on the new data.
     */
    const altFixture = {
      nodes: [
        { id: 'm1', label: 'Helsinki', type: 'Place', properties: {} },
        { id: 'm2', label: 'Reagent X', type: 'Compound', properties: {} },
      ],
      edges: [{ id: 'g1', source: 'm1', target: 'm2', type: 'TESTED_IN' }],
      total_nodes: 2,
      total_edges: 1,
    }

    function Wrapper({ id, data }: { id: string; data: typeof fixture }) {
      return <GraphTab key={id} data={data} />
    }

    const { rerender } = render(<Wrapper id="tx-A" data={fixture} />)
    await screen.findByTestId('graph-viz')
    await userEvent.click(screen.getByRole('button', { name: /^None$/i }))
    expect(screen.queryByTestId('graph-viz')).not.toBeInTheDocument()

    // Navigate to a different transform. Without the key, the old
    // (empty) filter selection survives and the new graph would
    // render zero nodes — this assertion would fail.
    rerender(<Wrapper id="tx-B" data={altFixture} />)

    expect(await screen.findByTestId('graph-viz')).toHaveTextContent(
      '2 nodes / 1 edges'
    )
  })
})
