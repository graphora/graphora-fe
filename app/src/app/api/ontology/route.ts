import { NextResponse } from 'next/server'
import type { OntologyResponse } from '@/types/api'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/ontology`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        text: body.text
      }),
    })
    console.log(body, response)
    if (!response.ok) {
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
