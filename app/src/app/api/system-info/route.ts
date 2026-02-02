import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'

    // Fetch system info from backend (no auth required)
    const backendUrl = `${backendBaseUrl}/system-info`
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      // Cache for 5 minutes to reduce load
      next: { revalidate: 300 }
    })

    if (!backendResponse.ok) {
      console.error('Backend system-info error:', backendResponse.status)
      // Return defaults if backend is unavailable
      return NextResponse.json({
        storage_type: 'neo4j',
        auth_bypass_enabled: false,
        version: 'unknown'
      })
    }

    const data = await backendResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching system info:', error)
    // Return defaults on error
    return NextResponse.json({
      storage_type: 'neo4j',
      auth_bypass_enabled: false,
      version: 'unknown'
    })
  }
}
