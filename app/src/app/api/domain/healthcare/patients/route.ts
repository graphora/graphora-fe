import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// This API route will fetch the list of patients from the backend
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/domain/healthcare/patients`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId  // Pass user-id in header (note the hyphen)
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}
