import { NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

export async function GET(request: Request) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { token } = await getBackendAuthContext()

    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()

    const response = await fetch(
      `${backendBaseUrl}/api/v1/dashboard/summary${query ? `?${query}` : ''}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(errorText || `Failed to fetch dashboard summary (${response.status})`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching dashboard summary:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard summary' },
      { status: 500 }
    )
  }
}
