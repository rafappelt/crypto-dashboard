import { Subject, Observable } from 'rxjs';
import WebSocket from 'ws';
import { ExchangePair } from '@crypto-dashboard/shared';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { IExchangeRateReceiver } from '../../application/ports/exchange-rate-receiver.port.js';
import { ILogger } from '../../application/ports/logger.port.js';
import { FinnhubTradeMapper, FinnhubTradeDto } from './finnhub/finnhub-trade.mapper.js';
import { DEFAULT_MAX_RECONNECT_ATTEMPTS } from './constants.js';

export interface FinnhubConfig {
  apiKey: string;
  pairs: ExchangePair[];
  maxReconnectAttempts?: number;
  logger?: ILogger;
}

export class FinnhubAdapter implements IExchangeRateReceiver {
  private ws: WebSocket | null = null;
  private readonly apiKey: string;
  private readonly baseUrl = 'wss://ws.finnhub.io';
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly pairs: ExchangePair[];
  private readonly exchangeRateSubject = new Subject<ExchangeRateEntity>();
  private readonly logger: ILogger;

  constructor(config: FinnhubConfig) {
    this.apiKey = config.apiKey;
    this.pairs = config.pairs;
    this.maxReconnectAttempts = config.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS;
    this.logger = config.logger || this.createDefaultLogger();

    if (!this.apiKey) {
      this.logger.warn('FINNHUB_API_KEY not set. Finnhub adapter will not work.');
    }
  }

  private createDefaultLogger(): ILogger {
    // Fallback logger implementation
    return {
      debug: (msg, ...args) => console.debug(`[DEBUG] ${msg}`, ...args),
      info: (msg, ...args) => console.info(`[INFO] ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
      error: (msg, error, ...args) => console.error(`[ERROR] ${msg}`, error, ...args),
    };
  }

  getExchangeRates$(): Observable<ExchangeRateEntity> {
    return this.exchangeRateSubject.asObservable();
  }

  async connect(): Promise<void> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      const error = new Error('Finnhub API key is not configured');
      this.logger.error('Cannot connect to Finnhub: API key is missing', error);
      throw error;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.logger.info('Connecting to Finnhub WebSocket...');

    try {
      this.ws = new WebSocket(`${this.baseUrl}?token=${this.apiKey}`);

      this.ws.on('open', () => {
        this.logger.info('Connected to Finnhub WebSocket');
        this.reconnectAttempts = 0;
        this.subscribeToPairs();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          this.logger.error('Failed to parse Finnhub message', error);
        }
      });

      this.ws.on('error', (error) => {
        this.logger.error('Finnhub WebSocket error', error);
      });

      this.ws.on('close', () => {
        this.logger.warn('Finnhub WebSocket connection closed');
        this.ws = null;
        this.handleReconnect();
      });
    } catch (error) {
      this.logger.error('Failed to create Finnhub WebSocket connection', error);
      this.handleReconnect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private subscribeToPairs(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn(`Cannot subscribe: WebSocket is ${!this.ws ? 'null' : `not open (state: ${this.ws.readyState})`}`);
      return;
    }

    if (this.pairs.length === 0) {
      this.logger.warn('No pairs configured to subscribe');
      return;
    }

    this.logger.info(`Subscribing to ${this.pairs.length} pair(s)`);

    this.pairs.forEach((pair) => {
      const symbol = FinnhubTradeMapper.getSymbolForPair(pair);
      const subscribeMessage = {
        type: 'subscribe',
        symbol: symbol,
      };
      
      if (!this.ws) {
        this.logger.error(`Cannot send subscription for ${pair}: WebSocket is null`);
        return;
      }
      
      try {
        this.ws.send(JSON.stringify(subscribeMessage));
        this.logger.info(`Subscribed to ${symbol} (${pair})`);
      } catch (error) {
        this.logger.error(`Failed to send subscription for ${pair}`, error);
      }
    });
  }

  private handleMessage(message: unknown): void {
    if (typeof message !== 'object' || message === null) {
      return;
    }

    const msg = message as { type?: string; data?: unknown[] };

    if (msg.type === 'trade' && Array.isArray(msg.data)) {
      msg.data.forEach((trade: unknown) => {
        try {
          const tradeDto = trade as FinnhubTradeDto;
          const pair = FinnhubTradeMapper.getPairFromSymbol(tradeDto.s);
          
          if (pair) {
            const exchangeRateEntity = FinnhubTradeMapper.toExchangeRateEntity(
              tradeDto,
              pair
            );

            this.logger.debug(`Processed trade for ${pair}: ${tradeDto.p} at ${new Date(tradeDto.t).toISOString()}`);
            this.exchangeRateSubject.next(exchangeRateEntity);
          } else {
            this.logger.warn(`Unrecognized symbol in trade message: ${tradeDto.s}`);
          }
        } catch (error) {
          this.logger.error('Failed to process trade', error);
        }
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached. Stopping reconnection.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
}
