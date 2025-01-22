import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const apiUrl = `${process.env.BACKEND_API_URL}/api/v1/graph/${id}`
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return new NextResponse('Graph not found', { status: 404 })
      }
      throw new Error(`Failed to fetch graph: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error fetching graph:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
