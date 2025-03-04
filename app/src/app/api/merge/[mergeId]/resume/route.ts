import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { mergeId: string } }
) {
  try {
    const { mergeId } = params
    
    const response = await fetch(
      `${process.env.API_BASE_URL}/api/v1/merge/${mergeId}/resume`,
      {
        method: 'POST',
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
    console.error('Error resuming merge:', error)
    return NextResponse.json(
      { error: 'Failed to resume merge' },
      { status: 500 }
    )
  }
} 