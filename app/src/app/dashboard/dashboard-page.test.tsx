import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DashboardPage from './page'

type DashboardApiMock = {
  getRecentRuns: ReturnType<typeof vi.fn>
  getSummary: ReturnType<typeof vi.fn>
  getPerformance: ReturnType<typeof vi.fn>
  getQuality: ReturnType<typeof vi.fn>
}

const dashboardApiMock = vi.hoisted(() => ({
  getRecentRuns: vi.fn(),
  getSummary: vi.fn(),
  getPerformance: vi.fn(),
  getQuality: vi.fn(),
})) as DashboardApiMock

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ isLoaded: true }),
  useClerk: () => ({
    signOut: vi.fn(),
    openUserProfile: vi.fn(),
  }),
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'test-user-id',
    getToken: vi.fn().mockResolvedValue('mock-token'),
  }),
}))

vi.mock('@/hooks/useUserConfig', () => ({
  useUserConfig: () => ({ checkConfigBeforeWorkflow: vi.fn(() => true) }),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...props
  }: {
    children: React.ReactNode
    href: string
    prefetch?: boolean
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/dashboard',
}))

vi.mock('@/components/setup/enhanced-config-check', () => ({
  EnhancedConfigCheck: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/dashboard-api', () => ({
  dashboardApi: dashboardApiMock,
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(dashboardApiMock).forEach((mockFn) => mockFn.mockReset())
  })

  it('renders aggregated KPI metrics from API responses', async () => {
    dashboardApiMock.getRecentRuns.mockResolvedValue({
      runs: [
        {
          transform_id: 'tx-1',
          session_id: 'sess-1',
          document_name: 'alpha.pdf',
          document_type: 'PDF',
          document_size_bytes: 1024,
          page_count: 2,
          processing_status: 'success',
          processing_started_at: '2024-01-02T10:00:00Z',
          processing_completed_at: '2024-01-02T10:05:00Z',
          processing_duration_ms: 300000,
          chunks_created: 4,
          nodes_extracted: 10,
          relationships_extracted: 4,
          quality_score: 92.4,
          quality_gate_status: 'pass',
          quality_requires_review: false,
          quality_gate_reasons: [],
          llm_usage: {
            total_calls: 2,
            input_tokens: 200,
            output_tokens: 50,
            total_tokens: 250,
            estimated_cost_usd: 0.19,
            models_used: ['openai:gpt-4o'],
          },
        },
      ],
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-07T00:00:00Z',
    })

    dashboardApiMock.getSummary.mockResolvedValue({
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-07T00:00:00Z',
      total_runs: 7,
      completed_runs: 6,
      failed_runs: 1,
      running_runs: 0,
      pass_count: 5,
      warn_count: 1,
      fail_count: 1,
      requires_review_count: 2,
      average_duration_ms: 240000,
      p50_duration_ms: 120000,
      p95_duration_ms: 300000,
      average_tokens_per_run: 380,
      total_tokens: 2600,
      total_llm_calls: 18,
      total_estimated_cost_usd: 3.45,
      runs_per_day: 1.2,
      recent_gate_reasons: ['Reason A'],
    })

    dashboardApiMock.getPerformance.mockResolvedValue({
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-07T00:00:00Z',
      total_runs: 7,
      total_tokens: 2600,
      total_llm_calls: 18,
      total_estimated_cost_usd: 3.45,
      timeseries: [],
    })

    dashboardApiMock.getQuality.mockResolvedValue({
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-07T00:00:00Z',
      average_score: 92.4,
      p50_score: 90,
      p95_score: 98,
      pass_count: 5,
      warn_count: 1,
      fail_count: 1,
      requires_review_count: 2,
      recent_reasons: [{ reason: 'Reason A', count: 2 }],
      top_rules: [],
      entity_coverage: [],
      entity_confidence: [],
    })

    render(<DashboardPage />)

    await waitFor(() => expect(screen.getByText('Transforms')).toBeInTheDocument())

    const transformsLabel = screen.getByText('Transforms')
    expect(transformsLabel.previousElementSibling?.textContent).toBe('7')

    const avgQualityLabel = screen.getByText('Avg Quality Score')
    expect(avgQualityLabel.previousElementSibling?.textContent).toBe('92.4')

    expect(screen.getByText('2m 0s p50')).toBeInTheDocument()
    expect(screen.getByText('Reason A (2)')).toBeInTheDocument()
  })

  it('renders empty states when no runs or quality data are available', async () => {
    dashboardApiMock.getRecentRuns.mockResolvedValue({
      runs: [],
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-07T00:00:00Z',
    })

    dashboardApiMock.getSummary.mockResolvedValue({
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-07T00:00:00Z',
      total_runs: 0,
      completed_runs: 0,
      failed_runs: 0,
      running_runs: 0,
      pass_count: 0,
      warn_count: 0,
      fail_count: 0,
      requires_review_count: 0,
      average_duration_ms: null,
      p50_duration_ms: null,
      p95_duration_ms: null,
      average_tokens_per_run: null,
      total_tokens: 0,
      total_llm_calls: 0,
      total_estimated_cost_usd: null,
      runs_per_day: null,
      recent_gate_reasons: [],
    })

    dashboardApiMock.getPerformance.mockResolvedValue({
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-07T00:00:00Z',
      total_runs: 0,
      total_tokens: 0,
      total_llm_calls: 0,
      total_estimated_cost_usd: null,
      timeseries: [],
    })

    dashboardApiMock.getQuality.mockResolvedValue({
      window_start: '2024-01-01T00:00:00Z',
      window_end: '2024-01-07T00:00:00Z',
      average_score: null,
      p50_score: null,
      p95_score: null,
      pass_count: 0,
      warn_count: 0,
      fail_count: 0,
      requires_review_count: 0,
      recent_reasons: [],
      top_rules: [],
      entity_coverage: [],
      entity_confidence: [],
    })

    render(<DashboardPage />)

    // Wait for all API calls to complete by checking for the empty state message
    await waitFor(
      () => {
        expect(screen.getByText(/No transforms recorded in this window/i)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    expect(screen.getByText(/No rule violations in this window/i)).toBeInTheDocument()
  })
})
