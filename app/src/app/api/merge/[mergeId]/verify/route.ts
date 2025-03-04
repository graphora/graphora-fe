import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { mergeId: string } }
) {
  try {
    const { mergeId } = params
    const response = await fetch(
      `${process.env.API_BASE_URL}/api/v1/merge/${mergeId}/verify`,
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
    console.error('Error verifying merge:', error)
    return NextResponse.json(
      { error: 'Failed to verify merge' },
      { status: 500 }
    )
  }
} 