import { NextRequest, NextResponse } from 'next/server'

// This API route will fetch the list of domain apps from the backend
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/domain/apps`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching domain apps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch domain apps' },
      { status: 500 }
    )
  }
}
