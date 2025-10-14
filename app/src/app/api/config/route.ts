import { NextRequest, NextResponse } from 'next/server'
import { getBackendAuthHeaders } from '@/lib/auth-utils'

// Utility function to sanitize passwords from logs
function sanitizeForLog(text: string): string {
  try {
    const parsed = JSON.parse(text)
    return JSON.stringify(sanitizePasswordsFromObject(parsed))
  } catch {
    // If it's not JSON, just replace password patterns
    return text.replace(/"password":\s*"[^"]*"/g, '"password":"***"')
      .replace(/password["\s]*:["\s]*[^,}\s]+/gi, 'password:"***"')
  }
}

function sanitizePasswordsFromObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizePasswordsFromObject(item))
  }
  
  const sanitized = { ...obj }
  for (const key in sanitized) {
    if (key.toLowerCase().includes('password')) {
      sanitized[key] = '***'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizePasswordsFromObject(sanitized[key])
    }
  }
  return sanitized
}

export async function GET(req: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    // Forward the request to the backend with user-id in header
    const backendUrl = `${backendBaseUrl}/api/v1/config`
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers
    })

    if (!backendResponse.ok) {
      const error = await backendResponse.text()
      console.error('Backend error response:', sanitizeForLog(error))
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: backendResponse.status }
      )
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in config GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { userId, headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    const body = await req.json()
    
    // Replace userEmail with userId for backend compatibility
    const configData = {
      ...body,
      userEmail: userId  // Backend expects userEmail field but it contains user_id
    }

    // Forward the request to the backend
    const backendUrl = `${backendBaseUrl}/api/v1/config`
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(configData)
    })

    if (!backendResponse.ok) {
      const error = await backendResponse.text()
      console.error('Backend error response:', sanitizeForLog(error))
      return NextResponse.json(
        { error: 'Failed to create configuration' },
        { status: backendResponse.status }
      )
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in config POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { userId, headers } = await getBackendAuthHeaders({ 'Content-Type': 'application/json' })

    const body = await req.json()
    
    // Replace userEmail with userId for backend compatibility
    const configData = {
      ...body,
      userEmail: userId  // Backend expects userEmail field but it contains user_id
    }

    // Forward the request to the backend
    const backendUrl = `${backendBaseUrl}/api/v1/config`
    const backendResponse = await fetch(backendUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(configData)
    })

    if (!backendResponse.ok) {
      const error = await backendResponse.text()
      console.error('Backend error response:', sanitizeForLog(error))
      return NextResponse.json(
        { error: 'Failed to update configuration' },
        { status: backendResponse.status }
      )
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in config PUT API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
