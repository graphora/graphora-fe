import { NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'

/**
 * Proxy for the backend's finalize-ontology endpoint.
 *
 * POST /api/transform/<transform_id>/finalize-ontology
 *   → POST <backend>/api/v1/transform/<transform_id>/finalize-ontology
 *
 * Forwards the optional `{ yaml_content }` body verbatim. When the
 * client omits the body, the backend re-infers via LLM. When the
 * client sends `{ yaml_content: "..." }`, the backend persists that
 * YAML directly without inference.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ transform_id: string }> }
) {
  try {
    const { transform_id } = await params
    const { headers } = await getBackendAuthHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    })

    let bodyToForward: string | undefined
    try {
      const incoming = await request.text()
      // Empty body is a valid call (legacy "infer & save"). Forward
      // only when the client actually sent something.
      if (incoming && incoming.trim() !== '') {
        bodyToForward = incoming
      }
    } catch {
      // Some clients send POST with no body and `request.text()` may
      // surface that as a hard error in older runtimes; treat as
      // "no body" rather than 400.
      bodyToForward = undefined
    }

    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const response = await fetch(
      `${backendBaseUrl}/api/v1/transform/${transform_id}/finalize-ontology`,
      {
        method: 'POST',
        headers,
        body: bodyToForward,
      }
    )

    const text = await response.text()
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error finalizing ontology:', error)
    return NextResponse.json(
      { error: 'Failed to finalize ontology' },
      { status: 500 }
    )
  }
}
