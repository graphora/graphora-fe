import { NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

interface SaveGraphRequest {
  nodes: {
    created: Array<{
      id: string;
      type: string;
      label: string;
      properties: Record<string, any>;
    }>;
    updated: Array<{
      id: string;
      properties: Record<string, any>;
    }>;
    deleted: Array<string>;
  };
  edges: {
    created: Array<{
      id: string;
      source: string;
      target: string;
      type: string;
      label: string;
      properties: Record<string, any>;
    }>;
    updated: Array<{
      id: string;
      properties: Record<string, any>;
    }>;
    deleted: Array<string>;
  };
  version: string;
}

export async function GET(
  request: Request,
  {params}: any
) {
  try {
    const { token } = await getBackendAuthContext()

    const { id } = await params
    
    // Build API URL (graph operations always use staging database)
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const apiUrl = `${backendUrl}/api/v1/graph/${id}`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      console.error('API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error response:', errorText)
      throw new Error(`Failed to fetch graph data: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data || !data.nodes || !data.edges) {
      console.error('Invalid data received:', data)
      throw new Error('Invalid graph data received from API')
    }

    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching graph data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch graph data' }, 
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  {params}: any
) {
  try {
    const { token } = await getBackendAuthContext()

    const {id} = await params
    
    // Build API URL (graph operations always use staging database)
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const apiUrl = `${backendUrl}/api/v1/graph/${id}`
    
    // Parse and validate request body
    const body: SaveGraphRequest = await request.json()
    
    // Forward the request to backend API
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Save error response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData?.error || `Failed to save graph: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving graph:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save graph' },
      { status: 500 }
    )
  }
}
