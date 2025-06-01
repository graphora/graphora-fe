import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { OntologyResponse } from '@/types/api'

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

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Create AbortController for timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    try {
      const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/ontology`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'user-id': userId,
          'Connection': 'keep-alive'
        },
        body: JSON.stringify({
          text: body.text
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Backend error:', sanitizeForLog(errorText))
        throw new Error('Failed to submit ontology')
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          console.error('Request timed out after 30 seconds')
          throw new Error('Request timed out - the server may be busy processing your ontology')
        } else if (fetchError.message.includes('ECONNRESET') || fetchError.message.includes('socket hang up')) {
          console.error('Connection reset by server')
          throw new Error('Connection lost - your ontology may still be processing. Please check back in a moment.')
        }
      }
      throw fetchError
    }
  } catch (error) {
    console.error('Error in ontology API:', error)
    const response: OntologyResponse = {
      id: '',
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to process ontology'
    }
    return NextResponse.json(response, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ontologyId, text } = body
    
    if (!ontologyId) {
      return NextResponse.json({ error: 'Ontology ID is required for updates' }, { status: 400 })
    }
    
    // Create AbortController for timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    try {
      const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/ontology/${ontologyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'user-id': userId,
          'Connection': 'keep-alive'
        },
        body: JSON.stringify({
          text: text
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Backend error:', sanitizeForLog(errorText))
        throw new Error('Failed to update ontology')
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          console.error('Request timed out after 30 seconds')
          throw new Error('Request timed out - the server may be busy processing your ontology')
        } else if (fetchError.message.includes('ECONNRESET') || fetchError.message.includes('socket hang up')) {
          console.error('Connection reset by server')
          throw new Error('Connection lost - your ontology may still be processing. Please check back in a moment.')
        }
      }
      throw fetchError
    }
  } catch (error) {
    console.error('Error in ontology API:', error)
    const response: OntologyResponse = {
      id: '',
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to update ontology'
    }
    return NextResponse.json(response, { status: 500 })
  }
}
