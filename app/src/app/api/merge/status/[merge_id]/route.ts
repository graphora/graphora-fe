import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Mock data for testing
const getMockMergeProgress = (mergeId: string) => {
  const now = new Date();
  const startTime = new Date(now.getTime() - 5 * 60000); // 5 minutes ago
  const estimatedEndTime = new Date(now.getTime() + 10 * 60000); // 10 minutes from now
  
  return {
    merge_id: mergeId,
    overall_status: 'IN_PROGRESS',
    overall_progress: 45,
    current_stage: 'Resolving entity conflicts',
    stages: [
      {
        name: 'Validation',
        status: 'completed',
        progress: 100,
        start_time: new Date(startTime.getTime() - 4 * 60000).toISOString(),
        end_time: new Date(startTime.getTime() - 3 * 60000).toISOString()
      },
      {
        name: 'Schema Mapping',
        status: 'completed',
        progress: 100,
        start_time: new Date(startTime.getTime() - 3 * 60000).toISOString(),
        end_time: new Date(startTime.getTime() - 2 * 60000).toISOString()
      },
      {
        name: 'Entity Resolution',
        status: 'completed',
        progress: 100,
        start_time: new Date(startTime.getTime() - 2 * 60000).toISOString(),
        end_time: new Date(startTime.getTime() - 1 * 60000).toISOString()
      },
      {
        name: 'Conflict Detection',
        status: 'completed',
        progress: 100,
        start_time: new Date(startTime.getTime() - 1 * 60000).toISOString(),
        end_time: new Date(startTime.getTime()).toISOString()
      },
      {
        name: 'Conflict Resolution',
        status: 'running',
        progress: 45,
        start_time: startTime.toISOString()
      },
      {
        name: 'Data Integration',
        status: 'pending',
        progress: 0
      },
      {
        name: 'Verification',
        status: 'pending',
        progress: 0
      }
    ],
    start_time: startTime.toISOString(),
    estimated_end_time: estimatedEndTime.toISOString(),
    has_conflicts: true,
    conflict_count: 3
  };
};

export async function GET(
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
      const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/merge/status/${merge_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
      
      // If backend API fails or is not available, use mock data
      console.log('Using mock data for merge status');
      return NextResponse.json(getMockMergeProgress(merge_id));
      
    } catch (error) {
      // If there's an error with the backend API, use mock data
      console.log('Error fetching from backend, using mock data:', error);
      return NextResponse.json(getMockMergeProgress(merge_id));
    }
  } catch (error) {
    console.error('Error getting merge status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 