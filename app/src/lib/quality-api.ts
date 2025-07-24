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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class QualityApiClient {
  private static instance: QualityApiClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1/quality`;
  }

  public static getInstance(): QualityApiClient {
    if (!QualityApiClient.instance) {
      QualityApiClient.instance = new QualityApiClient();
    }
    return QualityApiClient.instance;
  }

  private async request<T>(
    endpoint: string, 
    userId: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'user-id': userId,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get quality validation results for a transform
   */
  async getQualityResults(transformId: string, userId: string): Promise<QualityResults> {
    return this.request<QualityResults>(`/results/${transformId}`, userId);
  }

  /**
   * Get filtered violations for a transform
   */
  async getViolations(
    transformId: string, 
    userId: string,
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
    
    return this.request(endpoint, userId);
  }

  /**
   * Approve quality results and proceed to merge
   */
  async approveQualityResults(
    transformId: string, 
    userId: string,
    comment?: string
  ): Promise<QualityActionResponse> {
    return this.request<QualityActionResponse>(`/approve/${transformId}`, userId, {
      method: 'POST',
      body: JSON.stringify({ approval_comment: comment }),
    });
  }

  /**
   * Reject quality results and stop the process
   */
  async rejectQualityResults(
    transformId: string, 
    userId: string,
    reason: string
  ): Promise<QualityActionResponse> {
    return this.request<QualityActionResponse>(`/reject/${transformId}`, userId, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: reason }),
    });
  }

  /**
   * Get quality summary for the user
   */
  async getQualitySummary(userId: string, limit: number = 10): Promise<any[]> {
    const response = await this.request<{ recent_quality_results: any[] }>(`/summary?limit=${limit}`, userId);
    return response.recent_quality_results;
  }

  /**
   * Delete quality results for a transform
   */
  async deleteQualityResults(transformId: string, userId: string): Promise<void> {
    await this.request(`/results/${transformId}`, userId, {
      method: 'DELETE',
    });
  }

  /**
   * Check if quality API is available
   */
  async healthCheck(userId: string = 'anonymous'): Promise<QualityHealthCheck> {
    try {
      return await this.request<QualityHealthCheck>('/health', userId);
    } catch (error) {
      return {
        status: 'unavailable',
        quality_api_available: false,
        message: 'Quality validation API is not available'
      };
    }
  }
}

// Export singleton instance
export const qualityApi = QualityApiClient.getInstance();

// React hook for quality data
export function useQualityApi() {
  return qualityApi;
}