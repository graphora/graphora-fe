import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { transformId, sessionId, questionId, answer } = await request.json();

    if (!transformId || !sessionId || !questionId || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Forward the answer to the backend service
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/merge/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transform_id: transformId,
        session_id: sessionId,
        question_id: questionId,
        answer: answer,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to submit answer' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error submitting merge answer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
