import { NextResponse } from 'next/server'
import type { OntologyResponse } from '@/types/api'

// Static UUIDs for testing
const TEST_ONTOLOGY_IDS = [
  '550e8400-e29b-41d4-a716-446655440000',
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  '7ba7b810-9dad-11d1-80b4-00c04fd430c9'
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, ontologyText } = body

    if (!userId || !ontologyText) {
      const response: OntologyResponse = {
        id: '',
        status: 'error',
        error: 'Missing required fields'
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Return a random test UUID
    const response: OntologyResponse = {
      id: TEST_ONTOLOGY_IDS[Math.floor(Math.random() * TEST_ONTOLOGY_IDS.length)],
      status: 'success',
      message: 'Ontology processed successfully'
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    const response: OntologyResponse = {
      id: '',
      status: 'error',
      error: 'Internal server error'
    }
    return NextResponse.json(response, { status: 500 })
  }
}
