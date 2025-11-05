import { NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'
import { resolveRouteParams } from '@/app/api/_utils/route-helpers'

export async function GET(request: Request, context: any) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders()
    const { transformId } = await resolveRouteParams<{ transformId: string }>(context?.params)

    const response = await fetch(`${backendBaseUrl}/api/v1/quality/export/${transformId}`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('Quality export backend error:', errorText)
      return NextResponse.json(
        { error: 'Failed to export quality violations' },
        { status: response.status },
      )
    }

    const csvPayload = await response.text()
    const disposition =
      response.headers.get('content-disposition') ??
      `attachment; filename="quality-violations-${transformId}.csv"`

    return new NextResponse(csvPayload, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': disposition,
      },
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Quality export proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
