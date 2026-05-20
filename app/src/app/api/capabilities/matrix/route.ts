import { NextResponse } from 'next/server'

/**
 * GET /api/capabilities/matrix
 *   → GET <backend>/api/v1/capabilities/matrix
 *
 * Proxy for the M-matrix endpoint. Backend is unauthenticated
 * by design (matrix is repo-level documentation), so this
 * proxy doesn't forward an Authorization header. Mirrors the
 * bench-route proxy pattern.
 */
export async function GET() {
  try {
    const backendBaseUrl =
      process.env.BACKEND_API_URL || 'http://localhost:8000'
    const apiUrl = `${backendBaseUrl}/api/v1/capabilities/matrix`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      // The matrix is sourced from frozen module-level
      // constants in the backend; it doesn't change between
      // requests within a process lifetime. ``no-store`` is
      // still right because operator-side server restarts can
      // change deployment configuration (different package
      // version → potentially different matrix), and we want
      // the page to reflect the live backend's view rather
      // than a stale Next.js cache.
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
        { error: detail || `Matrix fetch failed (${response.status})` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching capability matrix:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch capability matrix',
      },
      { status: 500 }
    )
  }
}
