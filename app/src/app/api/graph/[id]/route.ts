import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

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
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    // Build API URL (graph operations always use staging database)
    const apiUrl = `${process.env.BACKEND_API_URL}/api/v1/graph/${id}`
    console.log('Fetching graph data from:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'user-id': userId  // Pass user-id in header (note the hyphen)
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
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {id} = await params
    
    // Build API URL (graph operations always use staging database)
    const apiUrl = `${process.env.BACKEND_API_URL}/api/v1/graph/${id}`
    
    // Parse and validate request body
    const body: SaveGraphRequest = await request.json()
    
    console.log('Saving graph data to:', apiUrl)
    
    // Forward the request to backend API
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId  // Pass user-id in header (note the hyphen)
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
    console.error('Error saving graph:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save graph' },
      { status: 500 }
    )
  }
}
