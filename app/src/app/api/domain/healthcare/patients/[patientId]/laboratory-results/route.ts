import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// This API route will fetch laboratory results for a specific patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { patientId } = await params
    
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/domain/healthcare/patients/${patientId}/laboratory-results`, {
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
    const { patientId } = await params
    console.error(`Error fetching laboratory results for patient ${patientId}:`, error)
    return NextResponse.json(
      { 
        error: `Failed to fetch laboratory results for patient ${patientId}`,
        laboratoryResults: [] 
      },
      { status: 500 }
    )
  }
}
