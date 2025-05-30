import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { OntologyResponse } from '@/types/api'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/ontology`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'user-id': userId
      },
      body: JSON.stringify({
        text: body.text
      }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', errorText)
      throw new Error('Failed to submit ontology')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in ontology API:', error)
    const response: OntologyResponse = {
      id: '',
      status: 'error',
      error: 'Failed to process ontology'
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
    
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/ontology/${ontologyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'user-id': userId
      },
      body: JSON.stringify({
        text: text
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', errorText)
      throw new Error('Failed to update ontology')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in ontology API:', error)
    const response: OntologyResponse = {
      id: '',
      status: 'error',
      error: 'Failed to update ontology'
    }
    return NextResponse.json(response, { status: 500 })
  }
}
