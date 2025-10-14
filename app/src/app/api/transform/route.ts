import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthHeaders, isUnauthorizedError } from '@/lib/auth-utils'

export async function POST(req: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { userId, headers } = await getBackendAuthHeaders()

    // Get session_id from the request URL
    const url = new URL(req.url)
    const sessionId = url.searchParams.get('session_id')
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Missing Files' },
        { status: 400 }
      )
    }

    // Forward the request to the backend (transforms use staging database)
    const backendUrl = `${backendBaseUrl}/api/v1/transform/${sessionId}/upload`
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: formData,
    })
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      
      // Try to parse the error and provide meaningful feedback
      try {
        const errorData = JSON.parse(errorText)
        return NextResponse.json({ 
          error: errorData.detail || 'Failed to process files',
          message: errorData.detail || 'An error occurred while processing your files',
          type: 'api_error'
        }, { status: backendResponse.status })
      } catch {
        // If JSON parsing fails, return the raw error
        return NextResponse.json({ 
          error: 'Failed to process files',
          message: errorText || 'An unknown error occurred while processing your files',
          type: 'unknown_error'
        }, { status: backendResponse.status })
      }
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in transform API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An internal error occurred while processing your files',
        type: 'internal_error'
      },
      { status: 500 }
    )
  }
} 
