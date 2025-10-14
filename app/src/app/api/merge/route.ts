import { NextResponse } from 'next/server';
import { getBackendAuthContext, isUnauthorizedError } from '@/lib/auth-utils';

// This is a WebSocket upgrade handler
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const transformId = searchParams.get('transformId');
  const sessionId = searchParams.get('sessionId');

  if (!transformId || !sessionId) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  try {
    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const { userId, token } = await getBackendAuthContext()

    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return NextResponse.json(
        { error: 'Not a WebSocket handshake' },
        { status: 400 }
      );
    }

    // Convert HTTP backend URL to WebSocket URL for server-side usage
    const backendWsUrl = backendBaseUrl.replace('http://', 'ws://').replace('https://', 'wss://')
    const wsUrl = `${backendWsUrl}/merge?transform_id=${transformId}&session_id=${sessionId}`;
    
    const response = await fetch(wsUrl, {
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'user-id': userId,
        Authorization: `Bearer ${token}`
      }
    });

    return response;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error upgrading to WebSocket:', error);
    return NextResponse.json(
      { error: 'Failed to establish WebSocket connection' },
      { status: 500 }
    );
  }
}
