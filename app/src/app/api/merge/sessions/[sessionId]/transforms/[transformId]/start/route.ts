import { NextResponse } from 'next/server';
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils';

export async function POST(
  request: Request,
  { params }: any
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const { token } = await getBackendAuthContext();

    const { sessionId, transformId } = params;

    if (!transformId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get the merge_id query parameter if provided
    const url = new URL(request.url);
    const mergeIdParam = url.searchParams.get('merge_id');
    const requestBody = await request.json().catch(() => ({}));
    const mergeId = requestBody.merge_id || mergeIdParam || null;

    // Construct the API URL
    const apiUrl = `${backendBaseUrl}/api/v1/merge/${sessionId}/${transformId}/start`;
    
    // Add merge_id query parameter if provided
    const finalUrl = mergeId ? `${apiUrl}?merge_id=${mergeId}` : apiUrl;

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Backend error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to start merge' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error starting merge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
