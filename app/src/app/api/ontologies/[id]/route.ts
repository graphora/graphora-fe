import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { token } = await getBackendAuthContext()

    const { id } = await params

    // Use BACKEND_API_URL from env-sample or fallback to localhost
    const apiUrl = `${backendBaseUrl}/api/v1/ontologies/${id}`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

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
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching ontology:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ontology'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 
