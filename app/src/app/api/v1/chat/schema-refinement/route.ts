import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request
    if (!body.user_request) {
      return NextResponse.json(
        { error: 'User request is required' },
        { status: 400 }
      )
    }

    // Get backend URL from environment
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    
    // Proxy request to Python backend
    const backendResponse = await fetch(`${backendUrl}/api/v1/chat/schema-refinement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId
      },
      body: JSON.stringify({
        session_id: body.session_id,
        initial_schema: body.initial_schema,
        schema_id: body.schema_id,
        user_request: body.user_request,
        context: body.context
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout for LLM processing
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
    console.error('Schema refinement proxy error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process schema refinement' },
      { status: 500 }
    )
  }
}