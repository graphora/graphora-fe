import { NextResponse } from 'next/server'

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
    const { id } = await params
    const apiUrl = `${process.env.BACKEND_API_URL}/api/v1/graph/${id}`
    console.log('Fetching graph data from:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('API error:', response.status, response.statusText)
      throw new Error('Failed to fetch graph data')
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
    const {id} = await params
    const apiUrl = `${process.env.BACKEND_API_URL}/api/v1/graph/${id}`
    
    // Parse and validate request body
    const body: SaveGraphRequest = await request.json()
    
    // Forward the request to backend API
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || 'Failed to save graph')
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
