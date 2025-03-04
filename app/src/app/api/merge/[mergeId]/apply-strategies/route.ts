import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { mergeId: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const merge_id = params.mergeId
    const body = await request.json()

    // Call the backend API to apply strategies
    const response = await fetch(`${process.env.API_BASE_URL}/api/v1/merge/${merge_id}/apply-strategies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${request.headers.get('Authorization')?.split(' ')[1] || ''}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to apply merge strategies' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error applying merge strategies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 