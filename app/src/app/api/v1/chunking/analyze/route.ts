import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get the backend API URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    // Forward the request to the backend chunking analyze endpoint
    const response = await fetch(`${backendUrl}/api/v1/chunking/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward user ID if available
        ...(request.headers.get('user-id') && {
          'user-id': request.headers.get('user-id')!
        })
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to analyze document' }))
      return NextResponse.json(
        { message: errorData.message || 'Failed to analyze document' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in chunking analyze API:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}