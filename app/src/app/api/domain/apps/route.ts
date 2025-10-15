import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'

// Mock domain apps data to use as fallback
const mockDomainApps = {
  domains: [
    {
      id: 'healthcare',
      title: 'Patient Journey',
      description: 'Patient journey analysis, medical records, and treatment pathways',
      color: 'bg-red-600',
      icon: 'Activity',
      enabled: true,
      path: '/domain/healthcare'
    },
    {
      id: 'finance',
      title: 'Financial Services',
      description: 'Transaction analysis, fraud detection, and risk assessment',
      color: 'bg-green-600',
      icon: 'ChartBar',
      enabled: false,
      path: '/domain/finance'
    },
    {
      id: 'legal',
      title: 'Legal',
      description: 'Case analysis, document review, and legal research',
      color: 'bg-blue-600',
      icon: 'FileText',
      enabled: false,
      path: '/domain/legal'
    }
  ]
};

// This API route will fetch the list of domain apps from the backend
export async function GET(request: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    // Check if backend API URL is configured
    if (!process.env.BACKEND_API_URL) {
      // No backend configured, return mock data
      return NextResponse.json(mockDomainApps)
    }

    try {
      const response = await fetch(`${backendBaseUrl}/api/v1/domain/apps`, {
        method: 'GET',
        headers,
      })
      
      if (!response.ok) {
        // Backend API error, fall back to mock data silently
        return NextResponse.json(mockDomainApps)
      }
      
      const data = await response.json()
      
      // If the backend returns empty domains, use our mock data
      if (!data.domains || data.domains.length === 0) {
        return NextResponse.json(mockDomainApps)
      }
      
      return NextResponse.json(data)
    } catch (backendError) {
      // Backend API is not available, fall back to mock data silently
      return NextResponse.json(mockDomainApps)
    }
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in domain apps API:', error)
    
    // Return mock data as final fallback
    return NextResponse.json(mockDomainApps)
  }
}
