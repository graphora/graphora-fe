import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserEmailOrThrow } from '@/lib/auth-utils'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = await getUserEmailOrThrow()

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

    // Add user email to form data
    formData.append('userEmail', userEmail)

    // Forward the request to the backend
    const backendUrl = `${process.env.BACKEND_API_URL}/api/v1/transform/${sessionId}/upload`
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
    })
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