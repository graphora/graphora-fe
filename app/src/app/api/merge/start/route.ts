import { NextResponse } from 'next/server';
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils';

export async function POST(request: Request) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const { token } = await getBackendAuthContext();

    // Get the full request body
    const body = await request.json().catch(() => ({}));
    const { sessionId, transformId, mergeId } = body;

    if (!transformId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId and transformId are required' },
        { status: 400 }
      );
    }


    // Construct the API URL (merges use production database)
    const apiUrl = `${backendBaseUrl}/api/v1/merge/${sessionId}/${transformId}/start`;
    
    // Add merge_id query parameter if provided
    const finalUrl = mergeId ? `${apiUrl}?merge_id=${mergeId}` : apiUrl;

    // Forward the request to the backend with the complete body
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body) // Pass the entire body to the backend
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: errorText };
      }
      return NextResponse.json(
        error,  // Return the full error object from the backend
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
