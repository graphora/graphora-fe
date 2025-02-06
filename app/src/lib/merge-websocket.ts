import type { MergeEvent, MergeStatus } from '@/types/merge';

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp?: string;
}

interface QuestionPayload {
  question_id: string;
  text: string;
  options?: string[];
}

interface StatusPayload {
  status: MergeStatus;
  progress: number;
  current_step?: string;
}

interface ErrorPayload {
  message: string;
}

interface AnswerPayload {
  question_id: string;
  answer: string;
  timestamp: string;
}

type MessageHandler = (payload: any) => void;

export class MergeWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 500; // 0.5 seconds
  private url: string;
  private connecting: boolean = false;

  constructor(baseUrl: string, sessionId: string) {
    this.sessionId = sessionId;
    // Construct WebSocket URL using the Next.js proxy
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${wsProtocol}//${host}${baseUrl}/merge/ws/${sessionId}`;
    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    this.messageHandlers.set('QUESTION', []);
    this.messageHandlers.set('STATUS', []);
    this.messageHandlers.set('ERROR', []);
    this.messageHandlers.set('PROGRESS', []);
  }

  public async connect(): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.connecting) {
      console.log('Connection attempt already in progress');
      return;
    }
    this.connecting = true;

    return new Promise((resolve, reject) => {
      try {
        console.log('Connecting to WebSocket:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.connecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connecting = false;
          this.attemptReconnect();
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          this.connecting = false;
          if (!event.wasClean) {
            console.error(`WebSocket connection closed unexpectedly. Code: ${event.code}`);
            this.attemptReconnect();
          } else {
            console.log('WebSocket connection closed cleanly');
          }
        };
      } catch (error) {
        this.connecting = false;
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    await this.connect();
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message.payload));
    } else {
      console.warn('No handlers found for message type:', message.type);
    }
  }

  public on(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  public off(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.messageHandlers.set(type, handlers);
      }
    }
  }

  public sendAnswer(questionId: string, answer: string) {
    const payload: AnswerPayload = {
      question_id: questionId,
      answer,
      timestamp: new Date().toISOString()
    };

    this.sendMessage('ANSWER', payload);
  }

  private sendMessage(type: string, payload: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };

    this.ws.send(JSON.stringify(message));
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.connecting = false;
  }

  public sendPause() {
    this.sendMessage('PAUSE', {
      timestamp: new Date().toISOString()
    });
  }

  public sendResume() {
    this.sendMessage('RESUME', {
      timestamp: new Date().toISOString()
    });
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
