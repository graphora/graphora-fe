import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  { params }: any
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mergeId, transformId } = await params;

    if (!mergeId || !transformId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`Fetching merge graph for user ${userId}: mergeId=${mergeId}, transformId=${transformId}`);

    try {
      // Build API URL (merge operations use production database)
      const apiUrl = `${process.env.BACKEND_API_URL}/api/v1/merge/graph/${mergeId}/${transformId}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId  // Pass user-id in header (note the hyphen)
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Successfully fetched merge graph for user ${userId}`);
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error fetching merge graph:', error);
      return NextResponse.json(
        { error: 'Failed to fetch merge graph' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error getting merge graph:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}