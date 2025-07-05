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
    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Get backend URL from environment
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    
    // Proxy request to Python backend
    const backendResponse = await fetch(`${backendUrl}/api/v1/schema/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId
      },
      body: JSON.stringify({
        query: body.query,
        domain: body.domain,
        limit: body.limit || 10,
        threshold: body.threshold || 0.5,
        include_content: body.includeContent || false
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend search error:', errorText)
      return NextResponse.json(
        { error: 'Backend service error' },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()

    // Convert backend response format to frontend format
    const response = {
      results: result.results?.map((schema: any) => ({
        id: schema.id,
        title: schema.title,
        description: schema.description,
        content: schema.content,
        similarity: schema.similarity,
        domain: schema.domain,
        tags: schema.tags,
        createdAt: schema.created_at,
        usageCount: schema.usage_count,
        userId: schema.user_id
      })) || [],
      total: result.total,
      query: result.query,
      tookMs: result.took_ms
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Schema search proxy error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search schemas' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    const limit = searchParams.get('limit') || '10'

    // Get backend URL from environment
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    
    // Build query parameters for backend
    const queryParams = new URLSearchParams()
    if (domain) queryParams.set('domain', domain)
    queryParams.set('limit', limit)

    // Proxy request to Python backend
    const backendResponse = await fetch(`${backendUrl}/api/v1/schema/search?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'user-id': userId
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend popular schemas error:', errorText)
      return NextResponse.json(
        { error: 'Backend service error' },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()

    // Convert backend response format to frontend format
    const response = {
      results: result.results?.map((schema: any) => ({
        id: schema.id,
        title: schema.title,
        description: schema.description,
        content: schema.content,
        similarity: schema.similarity,
        domain: schema.domain,
        tags: schema.tags,
        createdAt: schema.created_at,
        usageCount: schema.usage_count,
        userId: schema.user_id
      })) || [],
      total: result.total,
      query: result.query,
      tookMs: result.took_ms
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Popular schemas proxy error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get popular schemas' },
      { status: 500 }
    )
  }
}