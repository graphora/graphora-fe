import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Utility function to sanitize passwords from logs
function sanitizeForLog(text: string): string {
  try {
    const parsed = JSON.parse(text)
    return JSON.stringify(sanitizePasswordsFromObject(parsed))
  } catch {
    // If it's not JSON, just replace password patterns
    return text.replace(/"password":\s*"[^"]*"/g, '"password":"***"')
      .replace(/password["\s]*:["\s]*[^,}\s]+/gi, 'password:"***"')
  }
}

function sanitizePasswordsFromObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizePasswordsFromObject(item))
  }
  
  const sanitized = { ...obj }
  for (const key in sanitized) {
    if (key.toLowerCase().includes('password')) {
      sanitized[key] = '***'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizePasswordsFromObject(sanitized[key])
    }
  }
  return sanitized
}

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
        console.error('Backend error response:', sanitizeForLog(errorText));
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