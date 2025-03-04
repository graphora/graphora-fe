import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/constants';

export async function POST(
  request: Request,
  { params }: { params: { mergeId: string } }
) {
  try {
    // Check if user is authenticated
    const auth = await getAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { mergeId } = params;

    if (!mergeId) {
      return NextResponse.json(
        { error: 'Missing required mergeId' },
        { status: 400 }
      );
    }

    // Call backend API to cancel the merge
    const response = await fetch(
      `${API_BASE_URL}/merge/${mergeId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to cancel merge' },
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