import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { mergeId: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const merge_id = params.mergeId

    // Call the backend API to verify the merge
    const response = await fetch(
      `${process.env.API_BASE_URL}/api/v1/merge/${merge_id}/verify`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.headers.get('Authorization')?.split(' ')[1] || ''}`,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to verify merge' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      status: 'success',
      data,
      issues: data.issues || []
    })
  } catch (error) {
    console.error('Error verifying merge:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 