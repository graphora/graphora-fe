import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthHeaders } from '@/lib/auth-utils'
import type { ConnectionTestResponse } from '@/types/config'

export const runtime = 'nodejs'

/**
 * Test-connection route.
 *
 * **Why this is a proxy, not a direct Neo4j driver.** The Next.js server runs
 * on the host machine; the backend API runs inside a Docker container on a
 * private network. In a docker-compose dev stack, Neo4j is reachable:
 *   - from the host as `bolt://localhost:7687`
 *   - from the API container as `bolt://neo4j-staging:7687`
 *
 * If this route creates its own Neo4j driver, it executes in the host's
 * network context and fails for the hostnames the backend actually uses at
 * runtime. Proxying to the backend's `/api/v1/config/test-connection`
 * endpoint guarantees that "test connection" validates the exact URL the
 * backend will use when actually processing transforms — so a green test
 * here means merges and transforms will succeed too.
 */
export async function POST(request: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({
      'Content-Type': 'application/json',
    })

    const body = await request.json()

    const backendUrl = `${backendBaseUrl}/api/v1/config/test-connection`
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    // Pass through the backend's response verbatim, including the matching
    // HTTP status. Backend returns a fully-formed ConnectionTestResponse for
    // both success (200) and failure (4xx/5xx with {success:false,...}).
    const data = (await backendResponse.json()) as ConnectionTestResponse
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Test-connection proxy failed:', message)

    const response: ConnectionTestResponse = {
      success: false,
      message: 'Connection test unavailable',
      error: 'Could not reach the Graphora API. Is the backend running?',
    }

    return NextResponse.json(response, { status: 502 })
  }
}
