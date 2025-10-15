import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transformId: string }> }
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })
    const { transformId } = await params
    const body = await request.json().catch(() => ({}))

    const response = await fetch(`${backendBaseUrl}/api/v1/quality/reject/${transformId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rejection_reason: body.rejection_reason })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Quality reject backend error:', errorText)
      return NextResponse.json(
        { error: 'Failed to reject quality results' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Quality reject proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
