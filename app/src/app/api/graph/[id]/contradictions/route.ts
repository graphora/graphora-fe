import { NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

/**
 * GET /api/graph/<id>/contradictions[?min_confidence=0.0]
 *   → GET <backend>/api/v1/graph/<id>/contradictions[?min_confidence=…]
 *
 * Proxy for the B1-prob slice 2a backend endpoint. Returns the
 * structured contradictions surface: per-(target, property)
 * groups with competing claims sorted by confidence DESC, plus
 * ``total_claims_scanned`` for distinguishing the "no writer
 * yet" empty state from "writer healthy, consistent data."
 *
 * ``min_confidence`` is a passthrough query param — the backend
 * validates [0.0, 1.0] and 400s if out of range, so we forward
 * the raw user value rather than parsing/clamping here.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { token } = await getBackendAuthContext()

    const url = new URL(request.url)
    const minConfidence = url.searchParams.get('min_confidence')

    const backendBaseUrl =
      process.env.BACKEND_API_URL || 'http://localhost:8000'
    let apiUrl = `${backendBaseUrl}/api/v1/graph/${id}/contradictions`
    if (minConfidence !== null) {
      apiUrl += `?min_confidence=${encodeURIComponent(minConfidence)}`
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // Pass through the upstream status — in particular 400
      // (min_confidence out of range) and 404 (transform unknown
      // OR no claims yet, depending on tenant scoping). The
      // body's ``detail`` field is what the upstream uses for
      // the human message.
      const errorText = await response.text().catch(() => '')
      let detail = errorText
      try {
        const parsed = JSON.parse(errorText)
        detail = parsed.detail ?? parsed.error ?? errorText
      } catch {
        // Already plain text; leave detail as-is.
      }
      return NextResponse.json(
        { error: detail || `Contradictions fetch failed (${response.status})` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching contradictions:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch contradictions',
      },
      { status: 500 }
    )
  }
}
