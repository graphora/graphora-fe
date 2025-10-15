import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

// This API route will fetch laboratory results for a specific patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { token } = await getBackendAuthContext()

    const { patientId } = await params
    
    const response = await fetch(`${backendBaseUrl}/api/v1/domain/healthcare/patients/${patientId}/laboratory-results`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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
