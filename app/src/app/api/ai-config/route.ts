import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthHeaders } from '@/lib/auth-utils'

/**
 * Sanitize sensitive data for logging
 */
function sanitizeForLog(data: any): any {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      return sanitizeForLog(parsed)
    } catch {
      return data
    }
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data }
    if (sanitized.api_key) {
      sanitized.api_key = '***REDACTED***'
    }
    return sanitized
  }
  
  return data
}

export async function GET() {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    // Forward the request to the backend
    const backendUrl = `${backendBaseUrl}/api/v1/ai-config`
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers
    })

    if (backendResponse.status === 404) {
      return NextResponse.json(
        { error: 'AI configuration not found' },
        { status: 404 }
      )
    }

    if (!backendResponse.ok) {
      const error = await backendResponse.text()
      console.error('Backend error response:', sanitizeForLog(error))
      return NextResponse.json(
        { error: 'Failed to fetch AI configuration' },
        { status: backendResponse.status }
      )
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in AI config GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    const body = await req.json()

    // Forward the request to the backend
    const backendUrl = `${backendBaseUrl}/api/v1/ai-config/gemini`
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!backendResponse.ok) {
      const error = await backendResponse.text()
      console.error('Backend error response:', sanitizeForLog(error))
      return NextResponse.json(
        { error: 'Failed to create AI configuration' },
        { status: backendResponse.status }
      )
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in AI config POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    const body = await req.json()

    // Forward the request to the backend
    const backendUrl = `${backendBaseUrl}/api/v1/ai-config/gemini`
    const backendResponse = await fetch(backendUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    })

    if (!backendResponse.ok) {
      const error = await backendResponse.text()
      console.error('Backend error response:', sanitizeForLog(error))
      return NextResponse.json(
        { error: 'Failed to update AI configuration' },
        { status: backendResponse.status }
      )
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in AI config PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
