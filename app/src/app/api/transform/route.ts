import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { mockGraphData } from '@/lib/mock-data'

export async function POST(req: NextRequest) {
  try {
    // Get the auth session
    const { userId } = await auth()
    console.log(userId)
    
    // If there's no session, return unauthorized
    if (!userId) {
      return NextResponse.json(
        { status: 'error', error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const ontologyId = formData.get('ontologyId') as string

    if (!file || !ontologyId) {
      return NextResponse.json(
        { status: 'error', error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      return NextResponse.json({
        status: 'success',
        data: mockGraphData
      })
    }

    // Production code
    const backendUrl = process.env.BACKEND_API_URL + '/v1/transform'
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'X-User-ID': userId,
      },
    })

    const data = await backendResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in transform API:', error)
    return NextResponse.json(
      { status: 'error', error: 'Internal server error' },
      { status: 500 }
    )
  }
} 