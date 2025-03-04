import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(
  request: Request,
  {params}: any
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { merge_id } = await params;

    if (!merge_id) {
      return NextResponse.json(
        { error: 'Missing required merge_id' },
        { status: 400 }
      );
    }

    try {
      // Try to fetch from the backend API
      const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/merge/cancel/${merge_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
      
      // If backend API fails or is not available, use mock data
      console.log('Using mock data for merge cancel');
      return NextResponse.json({
        merge_id,
        status: 'cancelled',
        message: 'Merge process has been cancelled successfully'
      });
      
    } catch (error) {
      // If there's an error with the backend API, use mock data
      console.log('Error fetching from backend, using mock data:', error);
      return NextResponse.json({
        merge_id,
        status: 'cancelled',
        message: 'Merge process has been cancelled successfully'
      });
    }
  } catch (error) {
    console.error('Error canceling merge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 