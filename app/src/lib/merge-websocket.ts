import type { MergeEvent } from '@/types/merge';

export class MergeWebSocket extends WebSocket {
  constructor(url: string) {
    super(url);

    // Set up error handling
    this.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.onclose = (event) => {
      if (!event.wasClean) {
        console.error(`WebSocket connection closed unexpectedly. Code: ${event.code}`);
      }
    };
  }

  // Helper method to send messages
  sendMessage(type: string, payload: any) {
    this.send(JSON.stringify({
      type,
      payload,
      timestamp: new Date().toISOString()
    }));
  }
}
