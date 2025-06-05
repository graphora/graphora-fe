'use client'

import { useState, useEffect } from 'react'

export interface UsageSummary {
  current_period: {
    start: string
    end: string
    documents_processed: number
    pages_processed: number
    llm_calls: number
    tokens_used: number
    estimated_cost_usd: string
  }
  limits: {
    tier: string
    within_limits: boolean
    document_usage: string
    page_usage: string
    token_usage: string
    warnings: string[]
  }
  performance: {
    avg_processing_time_ms: number | null
    success_rate: string | null
  }
}

export interface UsageReport {
  user_id: string
  period_start: string
  period_end: string
  total_documents: number
  total_pages: number
  total_llm_calls: number
  total_tokens: number
  estimated_total_cost_usd: string
  document_types: Record<string, number>
  model_usage: Record<string, {
    calls: number
    input_tokens: number
    output_tokens: number
    total_tokens: number
    estimated_cost_usd: string
  }>
  daily_usage: Array<{
    date: string
    documents: number
    pages: number
    llm_calls: number
    tokens: number
  }>
  avg_processing_time_ms: number | null
  success_rate: string | null
}

export interface ModelUsageBreakdown {
  period: {
    start: string
    end: string
    days: number
  }
  totals: {
    total_calls: number
    total_tokens: number
    total_cost_usd: string
  }
  by_provider: Record<string, Record<string, {
    calls: number
    input_tokens: number
    output_tokens: number
    total_tokens: number
    estimated_cost_usd: string
    avg_tokens_per_call: number
  }>>
}

export interface UsageLimits {
  tier_name: string
  within_limits: boolean
  current_documents: number
  document_limit: number | null
  current_pages: number
  page_limit: number | null
  current_tokens: number
  token_limit: number | null
  warnings: string[]
}

export function useUsageSummary() {
  const [data, setData] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/usage/summary')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Error fetching usage summary:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch usage summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { data, loading, error, refetch: fetchData }
}

export function useUsageReport(startDate?: string, endDate?: string, days?: number) {
  const [data, setData] = useState<UsageReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      if (days !== undefined) params.append('days', days.toString())

      const url = `/api/usage/report${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Error fetching usage report:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch usage report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate, days])

  return { data, loading, error, refetch: fetchData }
}

export function useModelUsage(days: number = 30) {
  const [data, setData] = useState<ModelUsageBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/usage/models?days=${days}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Error fetching model usage:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch model usage')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [days])

  return { data, loading, error, refetch: fetchData }
}

export function useUsageLimits() {
  const [data, setData] = useState<UsageLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/usage/limits')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Error fetching usage limits:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch usage limits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return { data, loading, error, refetch: fetchData }
} 