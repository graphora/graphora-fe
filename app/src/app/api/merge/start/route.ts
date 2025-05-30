import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the full request body
    const body = await request.json().catch(() => ({}));
    const { sessionId, transformId, mergeId } = body;

    if (!transformId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId and transformId are required' },
        { status: 400 }
      );
    }

    console.log(`Starting merge for user ${userId}: sessionId=${sessionId}, transformId=${transformId}`);

    // Construct the API URL (merges use production database)
    const apiUrl = `${process.env.BACKEND_API_URL}/api/v1/merge/${sessionId}/${transformId}/start`;
    
    // Add merge_id query parameter if provided
    const finalUrl = mergeId ? `${apiUrl}?merge_id=${mergeId}` : apiUrl;

    // Forward the request to the backend with the complete body
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId  // Pass user-id in header (note the hyphen)
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
    console.log(`Merge started successfully for user ${userId}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error starting merge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}