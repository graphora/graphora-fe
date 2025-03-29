import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  { params }: { params: { mergeId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mergeId } = await params;

    if (!mergeId) {
      return NextResponse.json(
        { error: 'Missing required mergeId' },
        { status: 400 }
      );
    }

    try {
      // Fetch from the backend API
      const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/merge/${mergeId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error fetching from backend:', error);
      return NextResponse.json(
        { error: 'Failed to fetch merge status' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error getting merge status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}