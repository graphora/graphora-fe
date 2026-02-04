import { NextRequest } from 'next/server'
import { getBackendAuthHeaders } from '@/lib/auth-utils'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { headers } = await getBackendAuthHeaders()
    const { searchParams } = new URL(request.url)

    // Forward query params to backend
    const backendUrl = new URL(`${BACKEND_URL}/api/v1/chat/schema-chat/${sessionId}/stream`)
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value)
    })

    // Make request to backend
    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        ...(headers as Record<string, string>),
        'Accept': 'text/event-stream',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(
        JSON.stringify({ error: errorText || 'Failed to stream response' }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Stream the response directly
    const stream = response.body

    if (!stream) {
      return new Response(
        JSON.stringify({ error: 'No response body' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('Error in schema chat stream:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to stream response' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
