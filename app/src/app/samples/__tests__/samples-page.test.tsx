import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SamplesGalleryPage } from '../samples-page'

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

const mockResponse = {
  samples: [
    {
      slug: 'family_relationships',
      display_name: 'Family Relationships',
      domain: 'Family / personal',
      node_count: 4,
      edge_count: 5,
    },
    {
      slug: 'healthcare_clinical_note',
      display_name: 'Healthcare Clinical Note',
      domain: 'Healthcare',
      node_count: 3,
      edge_count: 2,
    },
    {
      slug: 'patient_admission',
      display_name: 'Patient Admission',
      domain: 'Healthcare',
      node_count: 3,
      edge_count: 2,
    },
  ],
  domains: ['Family / personal', 'Healthcare'],
}

describe('SamplesGalleryPage', () => {
  it('fetches /api/samples on mount', async () => {
    const spy = installFetchMock(() => ({ status: 200, body: mockResponse }))
    render(<SamplesGalleryPage />)
    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })
    expect(spy.mock.calls[0][0]).toBe('/api/samples')
  })

  it('renders every sample card from the response', async () => {
    installFetchMock(() => ({ status: 200, body: mockResponse }))
    render(<SamplesGalleryPage />)

    expect(
      await screen.findByText('Family Relationships')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Healthcare Clinical Note')
    ).toBeInTheDocument()
    expect(screen.getByText('Patient Admission')).toBeInTheDocument()
  })

  it('renders node + edge counts on each card', async () => {
    installFetchMock(() => ({ status: 200, body: mockResponse }))
    render(<SamplesGalleryPage />)

    // Family Relationships: 4 nodes · 5 edges
    expect(
      await screen.findByText(/4 nodes · 5 edges/)
    ).toBeInTheDocument()
  })

  it('renders domain filter chips with All + per-domain options', async () => {
    installFetchMock(() => ({ status: 200, body: mockResponse }))
    render(<SamplesGalleryPage />)

    // ``All (3)`` — total count badge in the chip
    expect(await screen.findByText(/All/)).toBeInTheDocument()
    // ``getAllByText`` because the domain renders both on the
    // chip AND on each card's badge.
    expect(
      screen.getAllByText('Family / personal').length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Healthcare').length).toBeGreaterThan(0)
  })

  it('filters samples when a domain chip is clicked', async () => {
    installFetchMock(() => ({ status: 200, body: mockResponse }))
    render(<SamplesGalleryPage />)

    // Wait for initial render — all three cards visible.
    await screen.findByText('Family Relationships')
    expect(
      screen.getByText('Healthcare Clinical Note')
    ).toBeInTheDocument()

    // Click the Healthcare chip — only Healthcare-domain
    // cards should remain.
    // The chip is the FIRST occurrence in document order
    // (chip row precedes the grid).
    const healthcareElements = screen.getAllByText('Healthcare')
    await userEvent.click(healthcareElements[0])

    // Family card is filtered out.
    await waitFor(() => {
      expect(
        screen.queryByText('Family Relationships')
      ).not.toBeInTheDocument()
    })
    // Healthcare cards remain.
    expect(
      screen.getByText('Healthcare Clinical Note')
    ).toBeInTheDocument()
    expect(screen.getByText('Patient Admission')).toBeInTheDocument()
  })

  it('surfaces fetch errors with retry CTA', async () => {
    installFetchMock(() => ({
      status: 500,
      body: { error: 'backend down' },
    }))
    render(<SamplesGalleryPage />)

    expect(
      await screen.findByText(/Could not load samples/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/backend down/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /retry/i })
    ).toBeInTheDocument()
  })

  it('renders empty-state when filter has no matches', async () => {
    // Edge case: a domain exists in the filter list but no
    // sample carries it. Could happen if the parser ever
    // surfaces extra domains. Pin so the grid degrades to a
    // visible "no matches" rather than rendering an empty
    // hole.
    const edgeResponse = {
      samples: [
        {
          slug: 'only-one',
          display_name: 'Only One',
          domain: 'A',
          node_count: 1,
          edge_count: 0,
        },
      ],
      domains: ['A', 'B'],
    }
    installFetchMock(() => ({ status: 200, body: edgeResponse }))
    render(<SamplesGalleryPage />)

    // Click the 'B' chip — no samples in domain B.
    const bChips = await screen.findAllByText('B')
    await userEvent.click(bChips[0])
    await waitFor(() => {
      expect(
        screen.queryByText('Only One')
      ).not.toBeInTheDocument()
    })
    expect(screen.getByText(/No samples in this domain/i)).toBeInTheDocument()
  })
})
