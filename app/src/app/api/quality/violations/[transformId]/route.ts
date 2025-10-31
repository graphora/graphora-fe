import { NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'

export async function GET(
  request: Request,
  context: any
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })
    const { transformId } = (context?.params ?? {}) as { transformId: string }

    const searchParams = new URL(request.url).searchParams
    const endpoint = `${backendBaseUrl}/api/v1/quality/violations/${transformId}?${searchParams.toString()}`

    const response = await fetch(endpoint, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Quality violations backend error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch quality violations' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Quality violations proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
