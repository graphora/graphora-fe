import { NextResponse } from 'next/server';
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mergeId: string; conflictId: string }> }
) {
  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const { token } = await getBackendAuthContext();

    const { mergeId, conflictId } = await params;
    
    if (!mergeId || !conflictId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get the learning comment from query parameter
    const url = new URL(request.url);
    const learningComment = url.searchParams.get('learning_comment');
    const resolution = url.searchParams.get('resolution');

    if (!learningComment) {
      return NextResponse.json(
        { error: 'Missing required learning_comment parameter' },
        { status: 400 }
      );
    }

    // Get the changed properties from the request body
    const changedProps = await request.json();

    try {
      // Construct the URL with the learning_comment query parameter
      const apiUrl = `${backendBaseUrl}/api/v1/merge/${mergeId}/conflicts/${conflictId}/resolve?resolution=${resolution}&learning_comment=${encodeURIComponent(learningComment)}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(changedProps)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return NextResponse.json(
        { error: 'Failed to resolve conflict' },
        { status: 500 }
      );
    }
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error resolving conflict:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
