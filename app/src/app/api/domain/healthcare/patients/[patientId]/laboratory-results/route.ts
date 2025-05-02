import { NextRequest, NextResponse } from 'next/server'

// This API route will fetch laboratory results for a specific patient
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const { patientId } = await params
    
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/domain/healthcare/patients/${patientId}/laboratory-results`, {
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
    console.error(`Error fetching laboratory results for patient ${params.patientId}:`, error)
    return NextResponse.json(
      { 
        error: `Failed to fetch laboratory results for patient ${params.patientId}`,
        laboratoryResults: [] 
      },
      { status: 500 }
    )
  }
}
