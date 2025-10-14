import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { token } = await getBackendAuthContext()

    const body = await request.json()

    // Validate request
    if (!body.userResponses || body.userResponses.length === 0) {
      return NextResponse.json(
        { error: 'User responses are required' },
        { status: 400 }
      )
    }

    // Get backend URL from environment
    // Proxy request to Python backend
    const backendResponse = await fetch(`${backendBaseUrl}/api/v1/schema/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        user_responses: body.userResponses.map((resp: any) => ({
          question_id: resp.questionId,
          value: resp.value
        })),
        context: body.context,
        options: body.options
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

    // Convert backend response format to frontend format
    const response = {
      id: result.id,
      schema: result.schema_content || result.schema,
      confidence: result.confidence,
      relatedSchemas: result.related_schemas?.map((schema: any) => ({
        id: schema.id,
        similarity: schema.similarity,
        title: schema.title,
        description: schema.description,
        domain: schema.domain,
        tags: schema.tags,
        usageCount: schema.usage_count
      })),
      suggestions: result.suggestions,
      metadata: result.metadata
    }

    return NextResponse.json(response)

  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Schema generation proxy error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate schema' },
      { status: 500 }
    )
  }
}
