import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session_id')
    const transformId = url.searchParams.get('transform_id')
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${process.env.BACKEND_API_URL}/api/v1/transform/status/${transformId}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error checking transform status:', error)
    return NextResponse.json(
      { error: 'Failed to check transform status' },
      { status: 500 }
    )
  }
}
