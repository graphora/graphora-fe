import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/api/v1/transform/status/${id}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'user-id': userId  // Pass user-id in header (note the hyphen)
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error checking transform status:', error)
    return NextResponse.json(
      { error: 'Failed to check transform status' },
      { status: 500 }
    )
  }
}
