import { NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

/**
 * GET /api/graph/<base>/diff/<compare>
 *   → GET <backend>/api/v1/graph/<base>/diff/<compare>
 *
 * Proxy for the B3-diff backend endpoint (graphora-server
 * commit a75cd73). Returns the structured graph-state diff
 * (added / removed / changed nodes + edges + summary counts)
 * between two transforms owned by the authenticated user.
 *
 * Error passthrough: in particular the 413 emitted when either
 * transform exceeds the 10k-node loader cap (see
 * graphora_server/api/graph.py::_check_truncated). The Diff tab
 * surfaces this to the user as "this transform is too large to
 * diff" rather than rendering a confident-but-wrong partial diff.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; compare: string }> }
) {
  try {
    const { id: base, compare } = await params
    const { token } = await getBackendAuthContext()

    const backendBaseUrl =
      process.env.BACKEND_API_URL || 'http://localhost:8000'
    const apiUrl = `${backendBaseUrl}/api/v1/graph/${base}/diff/${compare}`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // Pass through the upstream status code so the client can
      // distinguish 413 (truncated, can't diff) from 404 (transform
      // unknown) from 500 (server error). The body's ``detail``
      // field is what the upstream uses for the human message.
      const errorText = await response.text().catch(() => '')
      let detail = errorText
      try {
        const parsed = JSON.parse(errorText)
        detail = parsed.detail ?? parsed.error ?? errorText
      } catch {
        // Already plain text; leave detail as-is.
      }
      return NextResponse.json(
        { error: detail || `Diff failed (${response.status})` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching graph diff:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch graph diff',
      },
      { status: 500 }
    )
  }
}
