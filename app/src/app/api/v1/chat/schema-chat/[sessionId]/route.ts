import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthHeaders } from '@/lib/auth-utils'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { headers } = await getBackendAuthHeaders()

    const response = await fetch(
      `${BACKEND_URL}/api/v1/chat/schema-chat/${sessionId}`,
      {
        method: 'GET',
        headers,
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to get session state' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error getting schema chat state:', error)
    return NextResponse.json(
      { error: 'Failed to get session state' },
      { status: 500 }
    )
  }
}
