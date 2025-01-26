import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { session_id: string } }
) {
  try {
    const sessionId = params.session_id;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/merge/${sessionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to cancel merge' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error canceling merge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
