import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'

// This API route will fetch the list of patients from the backend
export async function GET(request: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    const response = await fetch(`${backendBaseUrl}/api/v1/domain/healthcare/patients`, {
      method: 'GET',
      headers,
    })
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}
