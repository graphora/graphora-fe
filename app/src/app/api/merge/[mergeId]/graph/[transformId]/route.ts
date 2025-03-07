import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { API_BASE_URL } from '@/lib/constants';

export async function GET(
  request: Request,
  { params }: { params: { mergeId: string, transformId: string } }
) {
  const { userId } = await auth();
  const { mergeId, transformId } = await params;

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (!mergeId) {
    return new NextResponse('Missing mergeId parameter', { status: 400 });
  }

  try {
    // Fetch the final merged graph from the backend
    const response = await fetch(`${API_BASE_URL}/merge/graph/${mergeId}/${transformId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({data});
  } catch (error) {
    console.error('Error fetching final merged graph:', error);
    return new NextResponse('Failed to fetch final merged graph', { status: 500 });
  }
}
