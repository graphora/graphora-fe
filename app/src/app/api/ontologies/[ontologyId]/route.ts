import { NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'

export async function GET(
  _request: Request,
  context: any
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({
      'Content-Type': 'application/json',
      accept: 'application/json'
    })

    const { ontologyId } = (context?.params ?? {}) as { ontologyId: string }

    if (!ontologyId) {
      return NextResponse.json({ error: 'Ontology ID is required' }, { status: 400 })
    }

    const tryFetch = (path: string) =>
      fetch(`${backendBaseUrl}${path}`, {
        method: 'GET',
        headers
      })

    let response = await tryFetch(`/api/v1/ontologies/${ontologyId}`)

    if (response.status === 404) {
      // Older entries may live behind the singular endpoint.
      response = await tryFetch(`/api/v1/ontology/${ontologyId}`)
    }

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        const errorMessage = errorJson.detail || errorJson.error || 'Failed to fetch ontology'
        return NextResponse.json({ error: errorMessage }, { status: response.status })
      } catch {
        return NextResponse.json(
          { error: errorText || 'Failed to fetch ontology' },
          { status: response.status }
        )
      }
    }

    const data = await response.json()

    if ('text' in data && !('yaml_content' in data)) {
      return NextResponse.json({
        id: ontologyId,
        name: data.name ?? `Ontology ${ontologyId.slice(0, 8)}`,
        file_name: data.file_name ?? `${ontologyId}.yaml`,
        yaml_content: data.text,
        version: data.version ?? '1.0.0',
        metadata: data.metadata ?? {},
        source: data.source ?? 'database'
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching ontology:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch ontology'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  context: any
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({
      'Content-Type': 'application/json',
      accept: 'application/json'
    })

    const { ontologyId } = (context?.params ?? {}) as { ontologyId: string }

    if (!ontologyId) {
      return NextResponse.json({ error: 'Ontology ID is required' }, { status: 400 })
    }

    const tryDelete = (path: string) =>
      fetch(`${backendBaseUrl}${path}`, {
        method: 'DELETE',
        headers
      })

    let response = await tryDelete(`/api/v1/ontology/${ontologyId}`)

    if (response.status === 404) {
      response = await tryDelete(`/api/v1/ontologies/${ontologyId}`)
    }

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        const errorMessage = errorJson.detail || errorJson.error || 'Failed to delete ontology'
        return NextResponse.json({ error: errorMessage }, { status: response.status })
      } catch {
        return NextResponse.json(
          { error: errorText || 'Failed to delete ontology' },
          { status: response.status }
        )
      }
    }

    let payload: Record<string, unknown> = {}
    if (response.status !== 204) {
      try {
        payload = await response.json()
      } catch {
        payload = {}
      }
    }

    if (!payload.message) {
      payload.message = 'Ontology deleted successfully'
    }

    return NextResponse.json(payload)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting ontology:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete ontology'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: any
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({
      'Content-Type': 'application/json',
      accept: 'application/json'
    })

    const { ontologyId } = (context?.params ?? {}) as { ontologyId: string }

    if (!ontologyId) {
      return NextResponse.json({ error: 'Ontology ID is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body.text !== 'string') {
      return NextResponse.json({ error: 'Ontology text is required' }, { status: 400 })
    }

    const payload: Record<string, unknown> = { text: body.text }
    if (body.name) {
      payload.name = body.name
    }

    const tryUpdate = (path: string) =>
      fetch(`${backendBaseUrl}${path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      })

    let response = await tryUpdate(`/api/v1/ontology/${ontologyId}`)

    if (response.status === 404) {
      response = await tryUpdate(`/api/v1/ontologies/${ontologyId}`)
    }

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        const errorMessage = errorJson.detail || errorJson.error || 'Failed to update ontology'
        return NextResponse.json({ error: errorMessage }, { status: response.status })
      } catch {
        return NextResponse.json(
          { error: errorText || 'Failed to update ontology' },
          { status: response.status }
        )
      }
    }

    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating ontology:', error)
    const message = error instanceof Error ? error.message : 'Failed to update ontology'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
