import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/constants'

export async function GET(
  request: NextRequest,
  { params }: { params: { mergeId: string } }
) {
  try {
    const { mergeId } = await params
    const response = await fetch(
      `${API_BASE_URL}/merge/statistics/${mergeId}`,
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
    console.error('Error fetching merge statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch merge statistics' },
      { status: 500 }
    )
  }
} 