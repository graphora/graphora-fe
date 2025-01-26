import { NextResponse } from 'next/server';

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
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return NextResponse.json(
        { error: 'Not a WebSocket handshake' },
        { status: 400 }
      );
    }

    // Forward the WebSocket connection to the backend
    const backendWsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/merge?transform_id=${transformId}&session_id=${sessionId}`;
    const response = await fetch(backendWsUrl, {
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      }
    });

    return response;
  } catch (error) {
    console.error('Error upgrading to WebSocket:', error);
    return NextResponse.json(
      { error: 'Failed to establish WebSocket connection' },
      { status: 500 }
    );
  }
}
