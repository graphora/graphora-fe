import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { userId, token } = await getBackendAuthContext()

    const apiUrl = `${backendBaseUrl}/api/v1/usage/limits`
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId,
        Authorization: `Bearer ${token}`
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching usage limits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage limits' },
      { status: 500 }
    )
  }
} 
