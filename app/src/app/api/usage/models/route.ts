import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { token } = await getBackendAuthContext()

    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days') || '30'

    const apiUrl = `${backendBaseUrl}/api/v1/usage/models?days=${days}`
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
    console.error('Error fetching model usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch model usage' },
      { status: 500 }
    )
  }
} 
