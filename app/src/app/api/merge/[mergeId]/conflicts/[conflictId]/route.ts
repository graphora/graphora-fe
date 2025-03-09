import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'

export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const { mergeId, conflictId } = await params
    const response = await fetch(
      `${API_BASE_URL}/merge/conflicts/${mergeId}/${conflictId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching conflict details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conflict details' },
      { status: 500 }
    )
  }
} 