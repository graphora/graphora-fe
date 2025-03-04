import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(
  request: Request,
  {params}: any
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id } = await params;
    const { transform_id, action } = await request.json();

    if (!transform_id || !session_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (action !== 'pause' && action !== 'resume') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "pause" or "resume"' },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/merge/${session_id}/${transform_id}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Backend error:', error);
      return NextResponse.json(
        { error: error.message || `Failed to ${action} merge` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error ${action} merge:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 