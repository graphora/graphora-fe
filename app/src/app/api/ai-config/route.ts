import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthHeaders } from '@/lib/auth-utils'

const SUPPORTED_PROVIDERS = new Set(['gemini', 'openai', 'anthropic', 'ollama'])

/**
 * Sanitize sensitive data for logging
 */
function sanitizeForLog(data: unknown): unknown {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      return sanitizeForLog(parsed)
    } catch {
      return data
    }
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = { ...(data as Record<string, unknown>) }
    if ('api_key' in sanitized) {
      sanitized.api_key = '***REDACTED***'
    }
    return sanitized
  }

  return data
}

/**
 * Split a generic `/ai-config/{provider}` request body into:
 * - The provider name (used to build the backend URL path)
 * - The provider-agnostic payload the backend expects
 *
 * Returns `{ error }` (400) when the body is malformed or names an
 * unsupported provider.
 */
function splitProviderPayload(body: Record<string, unknown>): {
  provider: string
  payload: Record<string, unknown>
} | { error: string } {
  const provider = typeof body.provider === 'string' ? body.provider.toLowerCase() : ''
  if (!provider) {
    return { error: "Request body must include 'provider'" }
  }
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return {
      error: `Unsupported provider '${provider}'. Expected one of: ${Array.from(SUPPORTED_PROVIDERS).join(', ')}`,
    }
  }
  const { provider: _omit, ...payload } = body
  void _omit
  return { provider, payload }
}

export async function GET() {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    const backendUrl = `${backendBaseUrl}/api/v1/ai-config`
    const backendResponse = await fetch(backendUrl, { method: 'GET', headers })

    if (backendResponse.status === 404) {
      return NextResponse.json({ error: 'AI configuration not found' }, { status: 404 })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    const body = await req.json()
    const split = splitProviderPayload(body)
    if ('error' in split) {
      return NextResponse.json({ error: split.error }, { status: 400 })
    }

    const backendUrl = `${backendBaseUrl}/api/v1/ai-config/${split.provider}`
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(split.payload),
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    const body = await req.json()
    const split = splitProviderPayload(body)
    if ('error' in split) {
      return NextResponse.json({ error: split.error }, { status: 400 })
    }

    const backendUrl = `${backendBaseUrl}/api/v1/ai-config/${split.provider}`
    const backendResponse = await fetch(backendUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(split.payload),
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
