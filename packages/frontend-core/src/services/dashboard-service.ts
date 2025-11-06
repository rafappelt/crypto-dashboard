import {
  WebSocketMessage,
  ExchangeRateUpdate,
  HourlyAverage,
  ConnectionStatus as WSConnectionStatus,
  ExchangePair,
} from '@crypto-dashboard/shared';
import { IWebSocketAdapter } from '../adapters/websocket-adapter.interface.js';
import { ExchangeRateService } from './exchange-rate-service.js';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface DashboardServiceState {
  connectionStatus: ConnectionStatus;
  rates: Map<ExchangePair, ExchangeRateUpdate>;
  hourlyAverages: Map<ExchangePair, HourlyAverage>;
}

export class DashboardService {
  private connectionStatus: ConnectionStatus = 'disconnected';
  private exchangeRateService: ExchangeRateService;
  private stateChangeCallbacks: Array<(state: DashboardServiceState) => void> = [];

  constructor(private webSocketAdapter: IWebSocketAdapter) {
    this.exchangeRateService = new ExchangeRateService();
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.webSocketAdapter.onConnect(() => {
      this.connectionStatus = 'connected';
      this.webSocketAdapter.emit('subscribe', {});
      this.notifyStateChange();
    });

    this.webSocketAdapter.onDisconnect(() => {
      this.connectionStatus = 'disconnected';
      this.notifyStateChange();
    });

    this.webSocketAdapter.onError(() => {
      this.connectionStatus = 'error';
      this.notifyStateChange();
    });

    this.webSocketAdapter.onMessage((message: WebSocketMessage) => {
      this.handleMessage(message);
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    if (message.type === 'exchange-rate' && message.data) {
      const rateData = message.data as unknown as {
        pair: ExchangePair;
        price: number;
        timestamp: Date | string;
        hourlyAverage?: number;
      };
      
      // Convert timestamp string to Date if needed
      const rate: ExchangeRateUpdate = {
        pair: rateData.pair,
        price: rateData.price,
        timestamp: typeof rateData.timestamp === 'string' 
          ? new Date(rateData.timestamp) 
          : rateData.timestamp,
        hourlyAverage: rateData.hourlyAverage,
      };
      
      this.exchangeRateService.updateRate(rate);
      this.notifyStateChange();
    } else if (message.type === 'hourly-average' && message.data) {
      const averageData = message.data as unknown as {
        pair: ExchangePair;
        averagePrice: number;
        hour: Date | string;
        sampleCount: number;
      };
      
      // Convert hour string to Date if needed
      const average: HourlyAverage = {
        pair: averageData.pair,
        averagePrice: averageData.averagePrice,
        hour: typeof averageData.hour === 'string' 
          ? new Date(averageData.hour) 
          : averageData.hour,
        sampleCount: averageData.sampleCount,
      };
      
      this.exchangeRateService.updateHourlyAverage(average);
      this.notifyStateChange();
    } else if (message.type === 'connection-status' && message.data) {
      const status = message.data as WSConnectionStatus;
      this.connectionStatus = status.status;
      this.notifyStateChange();
    }
  }

  connect(): void {
    if (this.connectionStatus === 'connecting' || this.connectionStatus === 'connected') {
      return;
    }

    this.connectionStatus = 'connecting';
    this.notifyStateChange();
    this.webSocketAdapter.connect();
  }

  disconnect(): void {
    this.webSocketAdapter.disconnect();
    this.connectionStatus = 'disconnected';
    this.exchangeRateService.clear();
    this.notifyStateChange();
  }

  onStateChange(callback: (state: DashboardServiceState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  getState(): DashboardServiceState {
    return {
      connectionStatus: this.connectionStatus,
      rates: this.exchangeRateService.getAllRates(),
      hourlyAverages: this.exchangeRateService.getAllHourlyAverages(),
    };
  }

  getExchangeRateService(): ExchangeRateService {
    return this.exchangeRateService;
  }

  private notifyStateChange(): void {
    const state = this.getState();
    this.stateChangeCallbacks.forEach((callback) => callback(state));
  }
}

