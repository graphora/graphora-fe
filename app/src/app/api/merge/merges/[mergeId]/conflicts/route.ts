import { NextResponse } from 'next/server';
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mergeId: string }> }
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const { userId, token } = await getBackendAuthContext();

    const { mergeId } = await params;

    if (!mergeId) {
      return NextResponse.json(
        { error: 'Missing required mergeId' },
        { status: 400 }
      );
    }

    try {
      const response = await fetch(`${backendBaseUrl}/api/v1/merge/${mergeId}/conflicts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId,
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conflicts' },
        { status: 500 }
      );
    }
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error getting conflicts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
