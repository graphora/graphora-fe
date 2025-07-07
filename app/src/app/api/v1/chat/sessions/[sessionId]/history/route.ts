import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { sessionId } = await params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '50'

    // Get backend URL from environment
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    
    // Proxy request to Python backend
    const backendResponse = await fetch(
      `${backendUrl}/api/v1/chat/sessions/${sessionId}/history?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
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