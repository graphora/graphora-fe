import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transformId, sessionId } = await request.json();

    if (!transformId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Make request to backend service
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/merge/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transform_id: transformId,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to submit merge' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in merge submit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
