import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { API_BASE_URL } from '@/lib/constants'

export async function POST(
  request: NextRequest,
  { params }: { params: { mergeId: string, conflictId: string } }
) {
  try {
    const { mergeId, conflictId } = await params
    const { userId } = getAuth(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call the backend API
    const response = await fetch(`${API_BASE_URL}/merge/${mergeId}/conflicts/${conflictId}/undo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || 'Failed to undo resolution' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in undo resolution API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 