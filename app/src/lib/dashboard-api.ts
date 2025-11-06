import { RecentRunsResponse } from '@/types/dashboard'

class DashboardApiClient {
  private static instance: DashboardApiClient
  private baseUrl = '/api/dashboard'

  static getInstance(): DashboardApiClient {
    if (!DashboardApiClient.instance) {
      DashboardApiClient.instance = new DashboardApiClient()
    }
    return DashboardApiClient.instance
  }

  private async request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })

    if (!response.ok) {
      let message = ''
      try {
        const payload = await response.clone().json()
        message = payload?.error || payload?.detail || ''
      } catch (err) {
        message = await response.text().catch(() => '')
      }
      throw new Error(message || `Dashboard API error (${response.status})`)
    }

    return response.json() as Promise<T>
  }

  getRecentRuns(params?: { limit?: number; days?: number }): Promise<RecentRunsResponse> {
    const search = new URLSearchParams()
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.days) search.set('days', String(params.days))
    const query = search.toString()
    return this.request<RecentRunsResponse>(`/runs${query ? `?${query}` : ''}`)
  }
}

export const dashboardApi = DashboardApiClient.getInstance()