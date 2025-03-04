import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { mergeId: string; conflictId: string } }
) {
  try {
    const { mergeId, conflictId } = params
    const response = await fetch(
      `${process.env.API_BASE_URL}/api/v1/merge/conflicts/${mergeId}/${conflictId}`,
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