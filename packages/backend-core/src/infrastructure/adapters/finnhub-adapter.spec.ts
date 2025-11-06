import { FinnhubAdapter } from './finnhub-adapter.js';
import { ExchangePair } from '@crypto-dashboard/shared';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { ILogger } from '../../application/ports/logger.port.js';
import WebSocket from 'ws';

// Mock WebSocket
jest.mock('ws');

describe('FinnhubAdapter', () => {
  let adapter: FinnhubAdapter;
  let mockLogger: jest.Mocked<ILogger>;
  let mockWebSocket: jest.Mocked<WebSocket>;
  let config: {
    apiKey: string;
    pairs: ExchangePair[];
    logger?: ILogger;
  };

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    config = {
      apiKey: 'test-api-key',
      pairs: ['ETH/USDC', 'ETH/USDT'] as ExchangePair[],
      logger: mockLogger,
    };

    // Mock WebSocket constructor
    mockWebSocket = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.CONNECTING,
    } as any;

    // Make readyState writable for testing
    Object.defineProperty(mockWebSocket, 'readyState', {
      writable: true,
      configurable: true,
      value: WebSocket.CONNECTING,
    });

    (WebSocket as jest.MockedClass<typeof WebSocket>).mockImplementation(() => mockWebSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to set readyState on mock WebSocket
  const setReadyState = (ws: any, state: number): void => {
    Object.defineProperty(ws, 'readyState', {
      writable: true,
      configurable: true,
      value: state,
    });
  };

  describe('constructor', () => {
    it('should create adapter with valid config', () => {
      adapter = new FinnhubAdapter(config);
      expect(adapter).toBeDefined();
    });

    it('should warn when API key is not set', () => {
      const adapterWithoutKey = new FinnhubAdapter({
        ...config,
        apiKey: '',
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('FINNHUB_API_KEY not set. Finnhub adapter will not work.');
    });

    it('should use default logger when not provided', () => {
      const adapterWithoutLogger = new FinnhubAdapter({
        apiKey: 'test-key',
        pairs: ['ETH/USDC'] as ExchangePair[],
      });
      expect(adapterWithoutLogger).toBeDefined();
    });

    it('should use custom maxReconnectAttempts when provided', () => {
      const adapterWithMaxAttempts = new FinnhubAdapter({
        ...config,
        maxReconnectAttempts: 5,
      });
      expect(adapterWithMaxAttempts).toBeDefined();
    });
  });

  describe('getExchangeRates$', () => {
    it('should return observable', () => {
      adapter = new FinnhubAdapter(config);
      const observable = adapter.getExchangeRates$();
      expect(observable).toBeDefined();
      expect(observable.subscribe).toBeDefined();
    });

    it('should emit exchange rates when received', async () => {
      adapter = new FinnhubAdapter(config);
      await adapter.connect();
      const observable = adapter.getExchangeRates$();

      const ratePromise = new Promise<ExchangeRateEntity>((resolve) => {
        observable.subscribe((rate: ExchangeRateEntity) => {
          resolve(rate);
        });
      });

      // Simulate WebSocket message
      const messageHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'message')?.[1] as ((data: WebSocket.Data) => void) | undefined;
      if (messageHandler) {
        const tradeMessage = {
          type: 'trade',
          data: [
            {
              p: 3436.02,
              t: Date.now(),
              s: 'BINANCE:ETHUSDC',
              v: 100,
            },
          ],
        };
        messageHandler(JSON.stringify(tradeMessage));
      } else {
        throw new Error('Message handler not found');
      }

      const rate = await ratePromise;
      expect(rate.pair).toBe('ETH/USDC');
      expect(rate.price).toBe(3436.02);
    });
  });

  describe('connect', () => {
    it('should throw error when API key is not configured', async () => {
      adapter = new FinnhubAdapter({
        ...config,
        apiKey: '',
      });

      await expect(adapter.connect()).rejects.toThrow('Finnhub API key is not configured');
    });

    it('should create WebSocket connection with correct URL', async () => {
      adapter = new FinnhubAdapter(config);
      await adapter.connect();

      expect(WebSocket).toHaveBeenCalledWith('wss://ws.finnhub.io?token=test-api-key');
    });

    it('should not reconnect if already connected', async () => {
      adapter = new FinnhubAdapter(config);
      // First connect to establish ws
      await adapter.connect();
      // Clear the mock to track if it's called again
      (WebSocket as jest.MockedClass<typeof WebSocket>).mockClear();
      // Set readyState to OPEN
      setReadyState(mockWebSocket, WebSocket.OPEN);
      // Set the adapter's ws to the mock
      (adapter as any).ws = mockWebSocket;

      await adapter.connect();

      expect(WebSocket).not.toHaveBeenCalled();
    });

    it('should set up WebSocket event handlers', async () => {
      adapter = new FinnhubAdapter(config);
      await adapter.connect();

      expect(mockWebSocket.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should subscribe to pairs on open', async () => {
      adapter = new FinnhubAdapter(config);
      await adapter.connect();

      const openHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'open')?.[1] as (() => void) | undefined;
      if (openHandler) {
        setReadyState(mockWebSocket, WebSocket.OPEN);
        openHandler();
        expect(mockLogger.info).toHaveBeenCalledWith('Connected to Finnhub WebSocket');
        expect(mockWebSocket.send).toHaveBeenCalled();
      }
    });

    it('should handle connection errors', async () => {
      adapter = new FinnhubAdapter(config);
      await adapter.connect();

      const errorHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'error')?.[1] as ((error: Error) => void) | undefined;
      if (errorHandler) {
        const error = new Error('Connection failed');
        errorHandler(error);
        expect(mockLogger.error).toHaveBeenCalledWith('Finnhub WebSocket error', error);
      }
    });

    it('should handle reconnection on close', async () => {
      adapter = new FinnhubAdapter({
        ...config,
        maxReconnectAttempts: 2,
      });
      await adapter.connect();

      const closeHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'close')?.[1] as (() => void) | undefined;
      if (closeHandler) {
        closeHandler();
        expect(mockLogger.warn).toHaveBeenCalledWith('Finnhub WebSocket connection closed');
      }
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket connection', async () => {
      adapter = new FinnhubAdapter(config);
      await adapter.connect();
      await adapter.disconnect();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should clear reconnect timeout', async () => {
      adapter = new FinnhubAdapter(config);
      await adapter.connect();

      // Ensure ws is set on adapter
      (adapter as any).ws = mockWebSocket;

      // Trigger close to set up reconnect timeout
      const closeHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'close')?.[1] as (() => void) | undefined;
      if (closeHandler) {
        // Don't let the close handler set ws to null for this test
        const originalClose = closeHandler;
        const modifiedClose = () => {
          // Call handleReconnect logic but don't set ws to null
          (adapter as any).handleReconnect();
        };
        // Replace the handler temporarily
        const closeCall = mockWebSocket.on.mock.calls.find((call) => call[0] === 'close');
        if (closeCall) {
          closeCall[1] = modifiedClose;
        }
        modifiedClose();
      }

      // Wait a bit for timeout to be set
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify timeout was set
      expect((adapter as any).reconnectTimeout).toBeDefined();

      await adapter.disconnect();
      
      // Verify timeout was cleared
      expect((adapter as any).reconnectTimeout).toBeNull();
    });

    it('should handle disconnect when not connected', async () => {
      adapter = new FinnhubAdapter(config);
      await expect(adapter.disconnect()).resolves.not.toThrow();
    });
  });

  describe('handleMessage', () => {
    beforeEach(async () => {
      adapter = new FinnhubAdapter(config);
      await adapter.connect();
    });

    it('should process trade messages', (done) => {
      const observable = adapter.getExchangeRates$();
      observable.subscribe((rate: ExchangeRateEntity) => {
        expect(rate.pair).toBe('ETH/USDC');
        expect(rate.price).toBe(3436.02);
        done();
      });

      const messageHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'message')?.[1] as ((data: WebSocket.Data) => void) | undefined;
      if (messageHandler) {
        const tradeMessage = {
          type: 'trade',
          data: [
            {
              p: 3436.02,
              t: Date.now(),
              s: 'BINANCE:ETHUSDC',
              v: 100,
            },
          ],
        };
        messageHandler(JSON.stringify(tradeMessage));
      }
    });

    it('should ignore non-trade messages', () => {
      const messageHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'message')?.[1] as ((data: WebSocket.Data) => void) | undefined;
      if (messageHandler) {
        const nonTradeMessage = {
          type: 'ping',
          data: {},
        };
        messageHandler(JSON.stringify(nonTradeMessage));
        expect(mockLogger.debug).not.toHaveBeenCalled();
      }
    });

    it('should handle invalid JSON messages', () => {
      const messageHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'message')?.[1] as ((data: WebSocket.Data) => void) | undefined;
      if (messageHandler) {
        messageHandler('invalid json');
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to parse Finnhub message',
          expect.any(Error)
        );
      }
    });

    it('should handle unrecognized symbols', () => {
      const messageHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'message')?.[1] as ((data: WebSocket.Data) => void) | undefined;
      if (messageHandler) {
        const tradeMessage = {
          type: 'trade',
          data: [
            {
              p: 3436.02,
              t: Date.now(),
              s: 'UNKNOWN:SYMBOL',
              v: 100,
            },
          ],
        };
        messageHandler(JSON.stringify(tradeMessage));
        expect(mockLogger.warn).toHaveBeenCalledWith('Unrecognized symbol in trade message: UNKNOWN:SYMBOL');
      }
    });
  });

  describe('subscribeToPairs', () => {
    it('should subscribe to all configured pairs', async () => {
      adapter = new FinnhubAdapter(config);
      await adapter.connect();

      const openHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'open')?.[1] as (() => void) | undefined;
      if (openHandler) {
        setReadyState(mockWebSocket, WebSocket.OPEN);
        openHandler();

        expect(mockWebSocket.send).toHaveBeenCalledTimes(2);
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'subscribe', symbol: 'BINANCE:ETHUSDC' })
        );
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'subscribe', symbol: 'BINANCE:ETHUSDT' })
        );
      }
    });

    it('should not subscribe when WebSocket is not open', async () => {
      adapter = new FinnhubAdapter(config);
      await adapter.connect();

      const openHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'open')?.[1] as (() => void) | undefined;
      if (openHandler) {
        setReadyState(mockWebSocket, WebSocket.CLOSED);
        openHandler();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Cannot subscribe: WebSocket is')
        );
      }
    });

    it('should warn when no pairs are configured', async () => {
      adapter = new FinnhubAdapter({
        ...config,
        pairs: [],
      });
      await adapter.connect();

      const openHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'open')?.[1] as (() => void) | undefined;
      if (openHandler) {
        setReadyState(mockWebSocket, WebSocket.OPEN);
        openHandler();

        expect(mockLogger.warn).toHaveBeenCalledWith('No pairs configured to subscribe');
      }
    });
  });
});

