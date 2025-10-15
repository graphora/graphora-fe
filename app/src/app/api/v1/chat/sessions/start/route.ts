import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { token } = await getBackendAuthContext()

    const body = await request.json()

    // Validate request
    if (!body.context_type) {
      return NextResponse.json(
        { error: 'Context type is required' },
        { status: 400 }
      )
    }

    // Get backend URL from environment
    // Proxy request to Python backend
    const backendResponse = await fetch(`${backendBaseUrl}/api/v1/chat/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        context_type: body.context_type,
        context_id: body.context_id,
        initial_context: body.initial_context,
        title: body.title
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

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
    console.error('Chat session start proxy error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to start chat session' },
      { status: 500 }
    )
  }
}
