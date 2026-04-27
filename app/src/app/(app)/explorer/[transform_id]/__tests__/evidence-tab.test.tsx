import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { EvidenceTab, pickEvidence } from '../evidence-tab'

const fixture = {
  nodes: [
    {
      id: 'n1',
      label: 'Alice',
      type: 'Person',
      properties: {
        name: 'Alice',
        source_text: 'Alice joined Acme in 2019.',
        document_name: 'paper.pdf',
        page_number: 3,
      },
    },
    {
      id: 'n2',
      label: 'Acme',
      type: 'Organization',
      properties: {
        name: 'Acme',
        source_text: 'Acme is headquartered in Berlin.',
        document_name: 'paper.pdf',
      },
    },
    {
      // No provenance fields — should be excluded from the list.
      id: 'n3',
      label: 'OrphanFact',
      type: 'Concept',
      properties: { name: 'OrphanFact' },
    },
  ],
  edges: [],
  total_nodes: 3,
  total_edges: 0,
}

describe('EvidenceTab', () => {
  it('lists only nodes that carry provenance fields', () => {
    render(<EvidenceTab data={fixture} />)
    // The "2 of 3 nodes" header line confirms n3 was filtered out.
    expect(screen.getByText(/2 of 3 nodes/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Alice/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Acme/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /OrphanFact/ })).not.toBeInTheDocument()
  })

  it('shows the source span for the first node by default', () => {
    render(<EvidenceTab data={fixture} />)
    // The source text appears in both the prominent blockquote and the
    // property-table row; pin the assertion to the blockquote so it
    // doesn't double-match.
    const blockquote = screen.getAllByText(
      'Alice joined Acme in 2019.'
    )[0]
    expect(blockquote.tagName).toBe('BLOCKQUOTE')
    expect(
      screen.getByText(/paper\.pdf/, { selector: 'span' })
    ).toBeInTheDocument()
  })

  it('switches detail panel when a different node is selected', async () => {
    render(<EvidenceTab data={fixture} />)
    await userEvent.click(screen.getByRole('button', { name: /Acme/ }))
    const blockquote = screen.getAllByText(
      'Acme is headquartered in Berlin.'
    )[0]
    expect(blockquote.tagName).toBe('BLOCKQUOTE')
  })

  it('shows the empty state when no nodes carry provenance', () => {
    const empty = {
      ...fixture,
      nodes: [
        { id: 'x', label: 'x', type: 'Thing', properties: { name: 'x' } },
      ],
    }
    render(<EvidenceTab data={empty} />)
    expect(
      screen.getByText(/No provenance recorded/i)
    ).toBeInTheDocument()
  })
})

describe('pickEvidence', () => {
  it('returns only the known evidence keys', () => {
    const node = {
      id: 'n',
      label: 'L',
      type: 'T',
      properties: {
        name: 'L',
        source_text: 'snippet',
        page_number: 2,
        unrelated: 'should not appear',
      },
    }
    const out = pickEvidence(node)
    expect(out).toEqual({ source_text: 'snippet', page_number: 2 })
    expect(out).not.toHaveProperty('unrelated')
    expect(out).not.toHaveProperty('name')
  })

  it('drops null and undefined values', () => {
    const node = {
      id: 'n',
      label: 'L',
      type: 'T',
      properties: {
        source_text: null,
        page_number: undefined,
        document_id: 'doc-7',
      },
    }
    expect(pickEvidence(node)).toEqual({ document_id: 'doc-7' })
  })

  it('picks the B0-prov-extend decision-trail fields', () => {
    /**
     * Regression for the contract sync between this file and the
     * backend ``graphora_server/mcp/server.py::_EVIDENCE_KEYS``.
     * Both sets must include extractor_model / prompt_version /
     * validator_score; if either side falls behind, the Evidence
     * tab and the get_evidence MCP tool drift.
     */
    const node = {
      id: 'n',
      label: 'Alice',
      type: 'Person',
      properties: {
        name: 'Alice',
        extractor_model: 'gemini-2.5-flash',
        prompt_version: 'v1.0.0',
        validator_score: 0.91,
        irrelevant_field: 'ignored',
      },
    }
    const out = pickEvidence(node)
    expect(out).toEqual({
      extractor_model: 'gemini-2.5-flash',
      prompt_version: 'v1.0.0',
      validator_score: 0.91,
    })
    expect(out).not.toHaveProperty('irrelevant_field')
  })
})
