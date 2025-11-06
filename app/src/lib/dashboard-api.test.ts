import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dashboardApi } from '@/lib/dashboard-api'

const originalFetch = global.fetch

describe('dashboardApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches summary data', async () => {
    const payload = {
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-07T00:00:00Z',
      total_runs: 5,
      completed_runs: 4,
      failed_runs: 1,
      running_runs: 0,
      pass_count: 3,
      warn_count: 1,
      fail_count: 1,
      requires_review_count: 1,
      average_duration_ms: 120000,
      p50_duration_ms: 90000,
      p95_duration_ms: 240000,
      average_tokens_per_run: 320,
      total_tokens: 1500,
      total_llm_calls: 8,
      total_estimated_cost_usd: 1.23,
      runs_per_day: 0.7,
      recent_gate_reasons: ['Low confidence'],
    }

    // @ts-expect-error partial fetch mock
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    })

    const result = await dashboardApi.getSummary()
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/dashboard/summary',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual(payload)
  })

  it('throws detailed error when performance request fails', async () => {
    // @ts-expect-error partial fetch mock
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'boom' }),
      text: () => Promise.resolve('boom'),
    })

    await expect(dashboardApi.getPerformance()).rejects.toThrow('boom')
  })

  it('fetches quality data with query params', async () => {
    const payload = {
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-07T00:00:00Z',
      average_score: 92.4,
      p50_score: 90,
      p95_score: 97,
      pass_count: 4,
      warn_count: 1,
      fail_count: 0,
      requires_review_count: 1,
      recent_reasons: [{ reason: 'Missing ticker', count: 1 }],
      top_rules: [{ rule_id: 'Company.ticker', severity: 'warning', count: 1 }],
      entity_coverage: [{ entity_type: 'Company', count: 2 }],
      entity_confidence: [{ entity_type: 'Company', average_confidence: 0.93 }],
    }

    // @ts-expect-error partial fetch mock
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    })

    const result = await dashboardApi.getQuality({ days: 10, max_runs: 50 })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/dashboard/quality?days=10&max_runs=50',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual(payload)
  })
})

afterAll(() => {
  global.fetch = originalFetch
})
