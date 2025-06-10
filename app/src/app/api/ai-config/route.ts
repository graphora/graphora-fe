import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

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
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Forward the request to the backend
    const backendUrl = `${process.env.BACKEND_API_URL}/api/v1/ai-config`
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId
      }
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
    console.error('Error in AI config GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    console.log('Creating AI configuration for user:', userId, sanitizeForLog(body))

    // Forward the request to the backend
    const backendUrl = `${process.env.BACKEND_API_URL}/api/v1/ai-config/gemini`
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId
      },
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
    console.error('Error in AI config POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    console.log('Updating AI configuration for user:', userId, sanitizeForLog(body))

    // Forward the request to the backend
    const backendUrl = `${process.env.BACKEND_API_URL}/api/v1/ai-config/gemini`
    const backendResponse = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId
      },
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
    console.error('Error in AI config PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 