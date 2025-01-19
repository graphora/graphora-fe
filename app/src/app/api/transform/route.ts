import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { mockGraphData } from '@/lib/mock-data'

export async function POST(req: NextRequest) {
  try {
    // Get session_id from the request URL
    const url = new URL(req.url)
    const sessionId = url.searchParams.get('session_id')
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      )
    }

    // Get the auth session
    const { userId } = await auth()
    
    // If there's no session, return unauthorized
    if (!userId) {
      return NextResponse.json(
        { status: 'error', error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { status: 'error', error: 'Missing Files' },
        { status: 400 }
      )
    }

    // Use mock data in development
    // if (process.env.NODE_ENV === 'development') {
    //   // Simulate processing delay
    //   await new Promise(resolve => setTimeout(resolve, 2000))

    //   return NextResponse.json({
    //     status: 'success',
    //     data: mockGraphData
    //   })
    // }

    // Forward the request to the backend
    const backendUrl = `${process.env.BACKEND_API_URL}/api/v1/transform/${sessionId}/upload`
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'X-User-ID': userId,
      },
    })
    console.log(backendResponse)
    if (!backendResponse.ok) {
      const error = await backendResponse.text()
      throw new Error(error)
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in transform API:', error)
    return NextResponse.json(
      { error: 'Failed to process files' },
      { status: 500 }
    )
  }
} 