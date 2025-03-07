import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/constants';

export async function GET(
  request: NextRequest,
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

    const { mergeId } = await params;

    // Call backend API to get merge status
    const response = await fetch(
      `${API_BASE_URL}/merge/${mergeId}/status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch merge status' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching merge status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 