import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { userId, token } = await getBackendAuthContext()
    const body = await request.json()
    
    // Forward the request to the backend chunking analyze endpoint
    const response = await fetch(`${backendBaseUrl}/api/v1/chunking/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId,
        Authorization: `Bearer ${token}`
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
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error in chunking analyze API:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
