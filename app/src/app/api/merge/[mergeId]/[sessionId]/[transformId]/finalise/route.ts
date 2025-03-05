import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { API_BASE_URL } from '@/lib/constants'

export async function GET(
  request: NextRequest,
  { params }: { params: { mergeId: string, sessionId: string, transformId: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mergeId, sessionId, transformId } = await params

    // Call the backend API to verify the merge
    const response = await fetch(
      `${API_BASE_URL}/merge/${mergeId}/${sessionId}/${transformId}/finalise`,
      {
        method: 'POST',
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
      status: data.status == 'false' ? 'error' : 'success',
      data,
      issues: data.checks || []
    })
  } catch (error) {
    console.error('Error verifying merge:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 