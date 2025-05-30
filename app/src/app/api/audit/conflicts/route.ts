import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await fetch(
      `${process.env.BACKEND_API_URL}/api/v1/audit/conflicts`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'user-id': userId
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
    console.error('Error fetching conflicts summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conflicts summary' },
      { status: 500 }
    )
  }
} 