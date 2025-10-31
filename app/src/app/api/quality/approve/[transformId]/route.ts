import { NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'
import { resolveRouteParams } from '@/app/api/_utils/route-helpers'

export async function POST(
  request: Request,
  context: any
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })
    const { transformId } = await resolveRouteParams<{ transformId: string }>(context?.params)
    const body = await request.json().catch(() => ({}))

    const response = await fetch(`${backendBaseUrl}/api/v1/quality/approve/${transformId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ approval_comment: body.approval_comment })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Quality approve backend error:', errorText)
      return NextResponse.json(
        { error: 'Failed to approve quality results' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Quality approve proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
