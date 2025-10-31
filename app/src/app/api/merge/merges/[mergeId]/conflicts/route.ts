import { NextResponse } from 'next/server';
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils';
import { resolveRouteParams } from '@/app/api/_utils/route-helpers'

export async function GET(
  request: Request,
  context: any
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const { token } = await getBackendAuthContext();

    const { mergeId } = await resolveRouteParams<{ mergeId: string }>(context?.params)

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
