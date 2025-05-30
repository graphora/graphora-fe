import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
          'accept': 'application/json',
          'user-id': userId
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
