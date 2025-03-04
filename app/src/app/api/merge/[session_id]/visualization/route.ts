import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  {params}: any
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id } = params;
    const url = new URL(request.url);
    const transform_id = url.searchParams.get('transform_id');

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Construct the URL with transform_id if provided
    let apiUrl = `${process.env.BACKEND_API_URL}/api/v1/merge/${session_id}/${transform_id}/visualization`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Return empty visualization data if not found
        return NextResponse.json({
          status: 'success',
          data: {
            nodes: [],
            edges: []
          }
        });
      }
      
      const error = await response.json();
      console.error('Backend error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get visualization data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting visualization data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
