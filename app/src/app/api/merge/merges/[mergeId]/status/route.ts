import { NextResponse } from 'next/server';
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mergeId: string }> }
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const { token } = await getBackendAuthContext();

    const { mergeId } = await params;

    if (!mergeId) {
      return NextResponse.json(
        { error: 'Missing required mergeId' },
        { status: 400 }
      );
    }

    try {
      // Fetch from the backend API
      const response = await fetch(`${backendBaseUrl}/api/v1/merge/${mergeId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Ensure we always return a consistent JSON structure
      // If the backend returns a string, convert it to an object
      if (typeof data === 'string') {
        return NextResponse.json({ status: data });
      }
      
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error fetching from backend:', error);
      return NextResponse.json(
        { error: 'Failed to fetch merge status' },
        { status: 500 }
      );
    }
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error getting merge status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
