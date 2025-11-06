import { WebSocketMessage } from '@crypto-dashboard/shared';
import { IWebSocketAdapter } from './websocket-adapter.interface.js';

// Use any for Socket type to avoid ES Module/CommonJS type conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Socket = any;

export class SocketIOAdapter implements IWebSocketAdapter {
  private socket: Socket | null = null;
  private messageCallbacks: Array<(message: WebSocketMessage) => void> = [];
  private connectCallbacks: Array<() => void> = [];
  private disconnectCallbacks: Array<() => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];

  constructor(private socketFactory: () => Socket) {}

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = this.socketFactory();

    this.socket.on('connect', () => {
      this.connectCallbacks.forEach((callback) => callback());
    });

    this.socket.on('disconnect', () => {
      this.disconnectCallbacks.forEach((callback) => callback());
    });

    this.socket.on('connect_error', (error: Error) => {
      this.errorCallbacks.forEach((callback) => callback(error));
    });

    this.socket.on('message', (message: WebSocketMessage) => {
      this.messageCallbacks.forEach((callback) => callback(message));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  onMessage(callback: (message: WebSocketMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  onConnect(callback: () => void): void {
    this.connectCallbacks.push(callback);
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

