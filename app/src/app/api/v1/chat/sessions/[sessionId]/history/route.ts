import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Authenticate user
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { token } = await getBackendAuthContext()

    const { sessionId } = await params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '50'

    // Get backend URL from environment
    // Proxy request to Python backend
    const backendResponse = await fetch(
      `${backendBaseUrl}/api/v1/chat/sessions/${sessionId}/history?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      }
    )

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend error:', errorText)
      return NextResponse.json(
        { error: 'Backend service error' },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    return NextResponse.json(result)

  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Session history proxy error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get session history' },
      { status: 500 }
    )
  }
}
