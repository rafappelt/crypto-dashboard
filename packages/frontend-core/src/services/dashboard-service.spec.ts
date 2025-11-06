import { DashboardService, DashboardServiceState } from './dashboard-service.js';
import { ExchangeRateService } from './exchange-rate-service.js';
import { IWebSocketAdapter } from '../adapters/websocket-adapter.interface.js';
import { ExchangeRateUpdate, HourlyAverage, ExchangePair, WebSocketMessage } from '@crypto-dashboard/shared';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockWebSocketAdapter: jest.Mocked<IWebSocketAdapter>;
  let onConnectCallback: (() => void) | undefined;
  let onDisconnectCallback: (() => void) | undefined;
  let onErrorCallback: ((error: Error) => void) | undefined;
  let onMessageCallback: ((message: WebSocketMessage) => void) | undefined;

  beforeEach(() => {
    mockWebSocketAdapter = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onConnect: jest.fn((callback) => {
        onConnectCallback = callback;
      }),
      onDisconnect: jest.fn((callback) => {
        onDisconnectCallback = callback;
      }),
      onError: jest.fn((callback) => {
        onErrorCallback = callback;
      }),
      onMessage: jest.fn((callback) => {
        onMessageCallback = callback;
      }),
      emit: jest.fn(),
      isConnected: jest.fn().mockReturnValue(false),
    };

    service = new DashboardService(mockWebSocketAdapter);
  });

  describe('constructor', () => {
    it('should set up WebSocket handlers', () => {
      expect(mockWebSocketAdapter.onConnect).toHaveBeenCalled();
      expect(mockWebSocketAdapter.onDisconnect).toHaveBeenCalled();
      expect(mockWebSocketAdapter.onError).toHaveBeenCalled();
      expect(mockWebSocketAdapter.onMessage).toHaveBeenCalled();
    });

    it('should initialize with disconnected status', () => {
      const state = service.getState();
      expect(state.connectionStatus).toBe('disconnected');
    });
  });

  describe('connect', () => {
    it('should set status to connecting and call adapter connect', () => {
      service.connect();

      expect(service.getState().connectionStatus).toBe('connecting');
      expect(mockWebSocketAdapter.connect).toHaveBeenCalled();
    });

    it('should not change status if already connecting', () => {
      service.connect();
      const firstState = service.getState();

      service.connect();
      const secondState = service.getState();

      expect(firstState.connectionStatus).toBe('connecting');
      expect(secondState.connectionStatus).toBe('connecting');
      expect(mockWebSocketAdapter.connect).toHaveBeenCalledTimes(1);
    });

    it('should not change status if already connected', () => {
      service.connect();
      if (onConnectCallback) {
        onConnectCallback();
      }

      const firstState = service.getState();
      service.connect();
      const secondState = service.getState();

      expect(firstState.connectionStatus).toBe('connected');
      expect(secondState.connectionStatus).toBe('connected');
      expect(mockWebSocketAdapter.connect).toHaveBeenCalledTimes(1);
    });

    it('should emit subscribe message when connected', () => {
      service.connect();
      if (onConnectCallback) {
        onConnectCallback();
      }

      expect(mockWebSocketAdapter.emit).toHaveBeenCalledWith('subscribe', {});
    });
  });

  describe('disconnect', () => {
    it('should call adapter disconnect and set status to disconnected', () => {
      service.disconnect();

      expect(mockWebSocketAdapter.disconnect).toHaveBeenCalled();
      expect(service.getState().connectionStatus).toBe('disconnected');
    });

    it('should clear exchange rate service', () => {
      const exchangeRateService = service.getExchangeRateService();
      const rate: ExchangeRateUpdate = {
        pair: 'ETH/USDC',
        price: 3436.02,
        timestamp: new Date(),
      };

      exchangeRateService.updateRate(rate);
      expect(exchangeRateService.getRate('ETH/USDC')).toBeDefined();

      service.disconnect();

      expect(exchangeRateService.getRate('ETH/USDC')).toBeUndefined();
    });
  });

  describe('WebSocket event handlers', () => {
    it('should update status to connected on connect event', () => {
      service.connect();
      if (onConnectCallback) {
        onConnectCallback();
      }

      expect(service.getState().connectionStatus).toBe('connected');
    });

    it('should update status to disconnected on disconnect event', () => {
      service.connect();
      if (onConnectCallback) {
        onConnectCallback();
      }

      if (onDisconnectCallback) {
        onDisconnectCallback();
      }

      expect(service.getState().connectionStatus).toBe('disconnected');
    });

    it('should update status to error on error event', () => {
      if (onErrorCallback) {
        onErrorCallback(new Error('Test error'));
      }

      expect(service.getState().connectionStatus).toBe('error');
    });

    it('should handle exchange-rate messages', () => {
      const timestamp = new Date();
      const message: WebSocketMessage = {
        type: 'exchange-rate',
        data: {
          pair: 'ETH/USDC',
          price: 3436.02,
          timestamp: timestamp,
        },
      };

      if (onMessageCallback) {
        onMessageCallback(message);
      }

      const exchangeRateService = service.getExchangeRateService();
      const rate = exchangeRateService.getRate('ETH/USDC');

      expect(rate).toBeDefined();
      expect(rate?.price).toBe(3436.02);
      expect(rate?.pair).toBe('ETH/USDC');
    });

    it('should handle exchange-rate messages with Date timestamp', () => {
      const timestamp = new Date();
      const message: WebSocketMessage = {
        type: 'exchange-rate',
        data: {
          pair: 'ETH/USDC',
          price: 3436.02,
          timestamp: timestamp,
        },
      };

      if (onMessageCallback) {
        onMessageCallback(message);
      }

      const exchangeRateService = service.getExchangeRateService();
      const rate = exchangeRateService.getRate('ETH/USDC');

      expect(rate?.timestamp).toEqual(timestamp);
    });

    it('should handle hourly-average messages', () => {
      const hour = new Date();
      const message: WebSocketMessage = {
        type: 'hourly-average',
        data: {
          pair: 'ETH/USDC',
          averagePrice: 3440.38,
          hour: hour,
          sampleCount: 10,
        },
      };

      if (onMessageCallback) {
        onMessageCallback(message);
      }

      const exchangeRateService = service.getExchangeRateService();
      const average = exchangeRateService.getHourlyAverage('ETH/USDC');

      expect(average).toBeDefined();
      expect(average?.averagePrice).toBe(3440.38);
      expect(average?.pair).toBe('ETH/USDC');
      expect(average?.sampleCount).toBe(10);
    });

    it('should handle connection-status messages', () => {
      const message: WebSocketMessage = {
        type: 'connection-status',
        data: {
          status: 'connected',
        },
      };

      if (onMessageCallback) {
        onMessageCallback(message);
      }

      expect(service.getState().connectionStatus).toBe('connected');
    });

    it('should ignore unknown message types', () => {
      const message: WebSocketMessage = {
        type: 'error' as any,
        data: undefined,
      };

      if (onMessageCallback) {
        onMessageCallback(message);
      }

      // Should not throw and should maintain current state
      expect(service.getState()).toBeDefined();
    });
  });

  describe('onStateChange', () => {
    it('should register callback that receives state updates', () => {
      const callback = jest.fn();

      service.onStateChange(callback);

      service.connect();

      expect(callback).toHaveBeenCalled();
      const state = callback.mock.calls[0][0];
      expect(state.connectionStatus).toBe('connecting');
    });

    it('should call all registered callbacks on state change', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.onStateChange(callback1);
      service.onStateChange(callback2);

      service.connect();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = service.getState();

      expect(state).toHaveProperty('connectionStatus');
      expect(state).toHaveProperty('rates');
      expect(state).toHaveProperty('hourlyAverages');
      expect(state.rates).toBeInstanceOf(Map);
      expect(state.hourlyAverages).toBeInstanceOf(Map);
    });

    it('should include all rates from exchange rate service', () => {
      const exchangeRateService = service.getExchangeRateService();
      const rate: ExchangeRateUpdate = {
        pair: 'ETH/USDC',
        price: 3436.02,
        timestamp: new Date(),
      };

      exchangeRateService.updateRate(rate);

      const state = service.getState();
      expect(state.rates.get('ETH/USDC')).toEqual(rate);
    });

    it('should include all hourly averages from exchange rate service', () => {
      const exchangeRateService = service.getExchangeRateService();
      const average: HourlyAverage = {
        pair: 'ETH/USDC',
        averagePrice: 3440.38,
        hour: new Date(),
        sampleCount: 10,
      };

      exchangeRateService.updateHourlyAverage(average);

      const state = service.getState();
      expect(state.hourlyAverages.get('ETH/USDC')).toEqual(average);
    });
  });

  describe('getExchangeRateService', () => {
    it('should return the exchange rate service instance', () => {
      const exchangeRateService = service.getExchangeRateService();

      expect(exchangeRateService).toBeInstanceOf(ExchangeRateService);
    });

    it('should return the same instance on multiple calls', () => {
      const service1 = service.getExchangeRateService();
      const service2 = service.getExchangeRateService();

      expect(service1).toBe(service2);
    });
  });
});

