import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const days = searchParams.get('days')

    let apiUrl = `${process.env.BACKEND_API_URL}/api/v1/usage/report`
    const queryParams = new URLSearchParams()
    
    if (startDate) queryParams.append('start_date', startDate)
    if (endDate) queryParams.append('end_date', endDate)
    if (days) queryParams.append('days', days)
    
    if (queryParams.toString()) {
      apiUrl += `?${queryParams.toString()}`
    }
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching usage report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage report' },
      { status: 500 }
    )
  }
} 