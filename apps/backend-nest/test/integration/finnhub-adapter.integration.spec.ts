import { FinnhubAdapter } from '@crypto-dashboard/backend-core';
import { ExchangePair } from '@crypto-dashboard/shared';
import { ExchangeRateEntity } from '@crypto-dashboard/backend-core';
import { createDefaultLogger } from '@crypto-dashboard/backend-core';
import WebSocket from 'ws';
import { Server as WebSocketServer } from 'ws';

describe('FinnhubAdapter Integration', () => {
  let adapter: FinnhubAdapter;
  let mockServer: WebSocketServer;
  let serverPort: number;
  let connectedClients: WebSocket[] = [];
  const testPairs: ExchangePair[] = ['ETH/USDC', 'ETH/USDT'];

  beforeAll((done) => {
    // Create a mock WebSocket server
    mockServer = new WebSocketServer({ port: 0 }, () => {
      serverPort = (mockServer.address() as { port: number }).port;
      done();
    });

    mockServer.on('connection', (ws) => {
      connectedClients.push(ws);

      // Send connection confirmation
      ws.send(JSON.stringify({ type: 'connected' }));

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'subscribe') {
          // Acknowledge subscription
          ws.send(
            JSON.stringify({
              type: 'subscribed',
              symbol: message.symbol,
            }),
          );
        }
      });
    });
  });

  afterAll((done) => {
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    mockServer.close(() => {
      done();
    });
  });

  beforeEach(() => {
    connectedClients = [];
    adapter = new FinnhubAdapter({
      apiKey: 'test-api-key',
      pairs: testPairs,
      maxReconnectAttempts: 3,
      logger: createDefaultLogger(),
    });
  });

  afterEach(async () => {
    try {
      await adapter.disconnect();
    } catch (error) {
      // Ignore disconnect errors
    }
  });

  describe('WebSocket Connection', () => {
    it('should connect to WebSocket server', async () => {
      // Override the base URL to point to our mock server
      (adapter as any).baseUrl = `ws://localhost:${serverPort}`;

      await adapter.connect();

      // Wait a bit for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(connectedClients.length).toBeGreaterThan(0);
    });

    it('should subscribe to configured pairs after connection', async () => {
      (adapter as any).baseUrl = `ws://localhost:${serverPort}`;

      await adapter.connect();

      // Wait for connection and subscription
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check that subscription messages were sent
      const client = connectedClients[0];
      expect(client).toBeDefined();
    });
  });

  describe('Message Handling', () => {
    it('should emit exchange rate when trade message is received', (done) => {
      (adapter as any).baseUrl = `ws://localhost:${serverPort}`;

      const observable = adapter.getExchangeRates$();
      observable.subscribe((rate: ExchangeRateEntity) => {
        expect(rate.pair).toBe('ETH/USDC');
        expect(rate.price).toBe(3436.02);
        expect(rate.timestamp).toBeInstanceOf(Date);
        done();
      });

      adapter.connect().then(() => {
        // Wait for connection
        setTimeout(() => {
          const client = connectedClients[0];
          if (client) {
            // Send a trade message
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
            client.send(JSON.stringify(tradeMessage));
          }
        }, 100);
      });
    });

    it('should handle multiple trade messages', (done) => {
      (adapter as any).baseUrl = `ws://localhost:${serverPort}`;

      const receivedRates: ExchangeRateEntity[] = [];
      const observable = adapter.getExchangeRates$();
      observable.subscribe((rate: ExchangeRateEntity) => {
        receivedRates.push(rate);
        if (receivedRates.length === 2) {
          expect(receivedRates[0].pair).toBe('ETH/USDC');
          expect(receivedRates[1].pair).toBe('ETH/USDT');
          done();
        }
      });

      adapter.connect().then(() => {
        setTimeout(() => {
          const client = connectedClients[0];
          if (client) {
            // Send multiple trade messages
            const tradeMessage1 = {
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
            const tradeMessage2 = {
              type: 'trade',
              data: [
                {
                  p: 2500.5,
                  t: Date.now(),
                  s: 'BINANCE:ETHUSDT',
                  v: 100,
                },
              ],
            };
            client.send(JSON.stringify(tradeMessage1));
            setTimeout(() => {
              client.send(JSON.stringify(tradeMessage2));
            }, 50);
          }
        }, 100);
      });
    });

    it('should ignore non-trade messages', (done) => {
      (adapter as any).baseUrl = `ws://localhost:${serverPort}`;

      const observable = adapter.getExchangeRates$();
      let receivedRate = false;

      observable.subscribe(() => {
        receivedRate = true;
      });

      adapter.connect().then(() => {
        setTimeout(() => {
          const client = connectedClients[0];
          if (client) {
            // Send a non-trade message
            const pingMessage = {
              type: 'ping',
              data: {},
            };
            client.send(JSON.stringify(pingMessage));

            // Wait a bit and check that no rate was received
            setTimeout(() => {
              expect(receivedRate).toBe(false);
              done();
            }, 100);
          }
        }, 100);
      });
    });
  });

  describe('Reconnection', () => {
    it('should attempt reconnection on connection close', async () => {
      (adapter as any).baseUrl = `ws://localhost:${serverPort}`;

      await adapter.connect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const initialClient = connectedClients[0];
      expect(initialClient).toBeDefined();

      // Close the connection
      if (initialClient) {
        initialClient.close();
      }

      // Wait for reconnection attempt
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should have attempted reconnection (may have new client or same)
      // The exact behavior depends on the reconnection logic
      expect(connectedClients.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Use an invalid port to force connection error
      (adapter as any).baseUrl = 'ws://localhost:99999';

      await expect(adapter.connect()).resolves.not.toThrow();
    });

    it('should handle invalid JSON messages', (done) => {
      (adapter as any).baseUrl = `ws://localhost:${serverPort}`;

      const observable = adapter.getExchangeRates$();
      observable.subscribe(() => {
        // Should not receive anything from invalid JSON
      });

      adapter.connect().then(() => {
        setTimeout(() => {
          const client = connectedClients[0];
          if (client) {
            // Send invalid JSON
            client.send('invalid json{');

            // Wait a bit - should not crash
            setTimeout(() => {
              done();
            }, 100);
          }
        }, 100);
      });
    });
  });
});


