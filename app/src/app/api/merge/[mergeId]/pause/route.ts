import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    const { mergeId } = params
    
    const response = await fetch(
      `${process.env.API_BASE_URL}/api/v1/merge/${mergeId}/pause`,
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
    console.error('Error pausing merge:', error)
    return NextResponse.json(
      { error: 'Failed to pause merge' },
      { status: 500 }
    )
  }
} 