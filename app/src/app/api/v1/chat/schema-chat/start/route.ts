import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthHeaders } from '@/lib/auth-utils'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const headers = await getBackendAuthHeaders()
    const { searchParams } = new URL(request.url)

    // Forward query params
    const backendUrl = new URL(`${BACKEND_URL}/api/v1/chat/schema-chat/start`)
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value)
    })

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to start session' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error starting schema chat:', error)
    return NextResponse.json(
      { error: 'Failed to start schema chat session' },
      { status: 500 }
    )
  }
}
