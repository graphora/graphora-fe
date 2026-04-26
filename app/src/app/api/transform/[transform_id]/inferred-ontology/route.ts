import { NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'

/**
 * Proxy for the backend's post-hoc ontology inference endpoint.
 *
 * GET /api/transform/<transform_id>/inferred-ontology
 *   → GET <backend>/api/v1/transform/<transform_id>/inferred-ontology
 *
 * The backend runs an LLM round-trip on every call, so the Explorer
 * Schema tab fires this only when the user actually clicks into
 * Schema (gated in ExplorerShell).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ transform_id: string }> }
) {
  try {
    const { transform_id } = await params
    const { headers } = await getBackendAuthHeaders({ accept: 'application/json' })

    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const response = await fetch(
      `${backendBaseUrl}/api/v1/transform/${transform_id}/inferred-ontology`,
      { method: 'GET', headers }
    )

    const body = await response.text()
    if (!response.ok) {
      return new NextResponse(body, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new NextResponse(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching inferred ontology:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inferred ontology' },
      { status: 500 }
    )
  }
}
