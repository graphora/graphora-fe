import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching ontologies for user:', userId) // Debug log

    // Use BACKEND_API_URL from env-sample or fallback to localhost
    const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const apiUrl = `${backendUrl}/api/v1/ontologies`
    console.log('API URL:', apiUrl) // Debug log

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId,
      },
    })

    console.log('API response status:', response.status) // Debug log

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API error response:', errorText)
      
      let errorMessage = `API responded with status: ${response.status}`
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.detail) {
          errorMessage = errorData.detail
        }
      } catch (e) {
        // If response is not JSON, use the text
        if (errorText) {
          errorMessage = errorText
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('API response data:', data) // Debug log
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching ontologies:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ontologies'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 