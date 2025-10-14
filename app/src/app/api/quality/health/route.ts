import { NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'

export async function GET() {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    const response = await fetch(`${backendBaseUrl}/api/v1/quality/health`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Quality health backend error:', errorText)
      return NextResponse.json(
        { status: 'unavailable', quality_api_available: false, message: 'Quality API unavailable' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Quality health proxy error:', error)
    return NextResponse.json(
      { status: 'unavailable', quality_api_available: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
