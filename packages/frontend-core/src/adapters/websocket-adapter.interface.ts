import { WebSocketMessage } from '@crypto-dashboard/shared';

export interface IWebSocketAdapter {
  connect(): void;
  disconnect(): void;
  onMessage(callback: (message: WebSocketMessage) => void): void;
  onConnect(callback: () => void): void;
  onDisconnect(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
  emit(event: string, data?: unknown): void;
  isConnected(): boolean;
}

