import { NextResponse } from 'next/server'

/**
 * GET /api/samples/<slug>
 *   → GET <backend>/api/v1/samples/<slug>
 *
 * Proxy for the per-sample detail. Returns document text +
 * ontology yaml + extracted graph (in GraphResponse shape) +
 * README markdown. Unauthenticated, same posture as the list
 * endpoint.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const backendBaseUrl =
      process.env.BACKEND_API_URL || 'http://localhost:8000'
    const apiUrl = `${backendBaseUrl}/api/v1/samples/${encodeURIComponent(slug)}`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      let detail = errorText
      try {
        const parsed = JSON.parse(errorText)
        detail = parsed.detail ?? parsed.error ?? errorText
      } catch {
        // Plain text — leave as-is.
      }
      return NextResponse.json(
        {
          error:
            detail || `Sample fetch failed (${response.status})`,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching sample detail:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch sample',
      },
      { status: 500 }
    )
  }
}
