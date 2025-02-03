import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  {params}: any
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id } = await params
    const response = await fetch(
      `${process.env.BACKEND_API_URL}/api/v1/merge/${session_id}/visualization`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching merge visualization:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
