import { NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'

export async function GET(request: Request) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { userId, headers } = await getBackendAuthHeaders({ accept: 'application/json' })

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
      `${backendBaseUrl}/api/v1/transform/status/${transformId}`,
      {
        method: 'GET',
        headers
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error checking transform status:', error)
    return NextResponse.json(
      { error: 'Failed to check transform status' },
      { status: 500 }
    )
  }
}
