import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { mergeId: string } }
) {
  try {
    const { mergeId } = params
    const body = await request.json()

    const response = await fetch(
      `${process.env.API_BASE_URL}/api/v1/merge/conflicts/${mergeId}/batch-resolve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error batch resolving conflicts:', error)
    return NextResponse.json(
      { error: 'Failed to batch resolve conflicts' },
      { status: 500 }
    )
  }
} 