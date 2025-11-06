export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  finnhub?: {
    status: 'ok' | 'error';
    error?: {
      code: string;
      message: string;
    };
  };
}

export class HealthCheckService {
  private readonly apiUrl: string;

  constructor() {
    // Use the same URL as WebSocket, which points to the backend
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3000';
    this.apiUrl = wsUrl;
  }

  async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/health`);
      const data = await response.json();

      if (!response.ok) {
        return {
          status: 'error',
          timestamp: data.timestamp || new Date().toISOString(),
          finnhub: data.finnhub,
        };
      }

      return data;
    } catch (error) {
      console.error('Failed to check API health:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        finnhub: {
          status: 'error',
          error: {
            code: 'CONNECTION_ERROR',
            message: 'Failed to connect to the API server',
          },
        },
      };
    }
  }
}

