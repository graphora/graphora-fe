import { NextResponse } from 'next/server'

/**
 * GET /api/samples
 *   → GET <backend>/api/v1/samples
 *
 * Proxy for the sample gallery list. Backend endpoint is
 * unauthenticated by design (public corpus content), so this
 * proxy doesn't forward an Authorization header. Mirrors the
 * bench/run + capabilities/matrix proxy pattern.
 */
export async function GET() {
  try {
    const backendBaseUrl =
      process.env.BACKEND_API_URL || 'http://localhost:8000'
    const apiUrl = `${backendBaseUrl}/api/v1/samples`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      // The samples list is sourced from frozen on-disk
      // corpus files — process restart is the only time
      // contents change. ``no-store`` is still appropriate
      // so a deploy-time corpus change reflects immediately.
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      let detail = errorText
      try {
        const parsed = JSON.parse(errorText)
        detail = parsed.detail ?? parsed.error ?? errorText
      } catch {
        // Already plain text.
      }
      return NextResponse.json(
        { error: detail || `Samples fetch failed (${response.status})` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching samples list:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch samples',
      },
      { status: 500 }
    )
  }
}
