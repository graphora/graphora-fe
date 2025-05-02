import { NextRequest, NextResponse } from 'next/server'

// This API route will fetch the journey data for a specific patient
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const { patientId } = await params
    
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/domain/healthcare/patients/${patientId}/journey`, {
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
    console.error(`Error fetching journey for patient ${params.patientId}:`, error)
    return NextResponse.json(
      { error: `Failed to fetch journey for patient ${params.patientId}` },
      { status: 500 }
    )
  }
}
