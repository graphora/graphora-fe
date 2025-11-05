/**
 * Quality validation API client
 */

import { 
  QualityResults, 
  QualityViolation, 
  QualityApiResponse, 
  ViolationFilters,
  QualityActionRequest,
  QualityActionResponse,
  QualityHealthCheck
} from '@/types/quality';

export class QualityApiClient {
  private static instance: QualityApiClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = '/api/quality';
  }

  public static getInstance(): QualityApiClient {
    if (!QualityApiClient.instance) {
      QualityApiClient.instance = new QualityApiClient();
    }
    return QualityApiClient.instance;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      method: 'GET',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get quality validation results for a transform
   */
  async getQualityResults(transformId: string): Promise<QualityResults> {
    return this.request<QualityResults>(`/results/${transformId}`)
  }

  /**
   * Get filtered violations for a transform
   */
  async getViolations(
    transformId: string,
    filters: ViolationFilters = {}
  ): Promise<{ violations: QualityViolation[]; total_returned: number }> {
    const queryParams = new URLSearchParams();
    
    if (filters.violation_type) queryParams.set('violation_type', filters.violation_type);
    if (filters.severity) queryParams.set('severity', filters.severity);
    if (filters.entity_type) queryParams.set('entity_type', filters.entity_type);
    if (filters.limit) queryParams.set('limit', filters.limit.toString());
    if (filters.offset) queryParams.set('offset', filters.offset.toString());

    const query = queryParams.toString();
    const endpoint = `/violations/${transformId}${query ? `?${query}` : ''}`;
    
    return this.request(endpoint)
  }

  /**
   * Approve quality results and proceed to merge
   */
  async approveQualityResults(
    transformId: string,
    comment?: string
  ): Promise<QualityActionResponse> {
    return this.request<QualityActionResponse>(`/approve/${transformId}`, {
      method: 'POST',
      body: JSON.stringify({ approval_comment: comment })
    })
  }

  /**
   * Reject quality results and stop the process
   */
  async rejectQualityResults(
    transformId: string,
    reason: string
  ): Promise<QualityActionResponse> {
    return this.request<QualityActionResponse>(`/reject/${transformId}`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: reason })
    })
  }

  /**
   * Get quality summary for the user
   */
  async getQualitySummary(limit: number = 10): Promise<any[]> {
    const response = await this.request<{ recent_quality_results: any[] }>(`/summary?limit=${limit}`)
    return response.recent_quality_results
  }

  /**
   * Delete quality results for a transform
   */
  async deleteQualityResults(transformId: string): Promise<void> {
    await this.request(`/results/${transformId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Download quality violations as CSV for the given transform.
   */
  async exportViolationsCsv(transformId: string): Promise<void> {
    const endpoint = `${this.baseUrl}/export/${transformId}`

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'text/csv',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      let message = ''
      try {
        const payload = await response.clone().json()
        message = payload?.detail || payload?.error || ''
      } catch (jsonErr) {
        message = await response.text().catch(() => '')
      }
      throw new Error(message || `Failed to export quality violations (HTTP ${response.status})`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    const disposition = response.headers.get('content-disposition') || ''
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
    const filename = filenameMatch?.[1] ?? `quality-violations-${transformId}.csv`

    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  /**
   * Check if quality API is available
   */
  async healthCheck(): Promise<QualityHealthCheck> {
    try {
      return await this.request<QualityHealthCheck>('/health')
    } catch (error) {
      return {
        status: 'unavailable',
        quality_api_available: false,
        message: 'Quality validation API is not available'
      }
    }
  }
}

// Export singleton instance
export const qualityApi = QualityApiClient.getInstance();

// React hook for quality data
export function useQualityApi() {
  return qualityApi;
}
