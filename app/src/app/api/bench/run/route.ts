import { NextResponse } from 'next/server'

/**
 * GET /api/bench/run
 *   → GET <backend>/api/v1/bench/run
 *
 * Proxy for the B4-bench public benchmark endpoint. The backend
 * route is unauthenticated by design — the bench's
 * reproducibility claim depends on anonymous fetchability — so
 * this proxy doesn't forward an Authorization header. It exists
 * mostly to keep the BACKEND_API_URL behind the Next.js server
 * and avoid CORS configuration on the public route.
 */
export async function GET() {
  try {
    const backendBaseUrl =
      process.env.BACKEND_API_URL || 'http://localhost:8000'
    const apiUrl = `${backendBaseUrl}/api/v1/bench/run`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      // Don't cache aggressively — the bench page is a real-time
      // view over committed bench/results/ files; if those files
      // change between requests, we want the new numbers. The
      // backend handler is fast enough that disabling caching
      // doesn't hurt the dashboard latency budget.
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      let detail = errorText
      try {
        const parsed = JSON.parse(errorText)
        detail = parsed.detail ?? parsed.error ?? errorText
      } catch {
        // Already plain text; leave detail as-is.
      }
      return NextResponse.json(
        { error: detail || `Bench fetch failed (${response.status})` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching bench report:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch bench report',
      },
      { status: 500 }
    )
  }
}
