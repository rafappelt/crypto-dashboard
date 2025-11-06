import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketGateway } from './websocket.gateway.js';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service.js';
import {
  IExchangeRateReceiver,
  IHourlyAveragePublisher,
  ExchangeRateEntity,
  HourlyAverageEntity,
} from '@crypto-dashboard/backend-core';
import { ExchangePair, DEFAULT_EXCHANGE_PAIRS } from '@crypto-dashboard/shared';
import { Subject } from 'rxjs';
import { Socket } from 'socket.io';
import {
  EXCHANGE_RATE_RECEIVER,
  HOURLY_AVERAGE_PUBLISHER,
} from '../core/core.module.js';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;
  let exchangeRateService: jest.Mocked<ExchangeRateService>;
  let exchangeRateReceiver: jest.Mocked<IExchangeRateReceiver>;
  let hourlyAveragePublisher: jest.Mocked<IHourlyAveragePublisher>;
  let mockSocket: jest.Mocked<Socket>;
  let exchangeRateSubject: Subject<ExchangeRateEntity>;
  let hourlyAverageSubject: Subject<HourlyAverageEntity>;

  beforeEach(async () => {
    exchangeRateSubject = new Subject<ExchangeRateEntity>();
    hourlyAverageSubject = new Subject<HourlyAverageEntity>();

    const mockExchangeRateService = {
      getLatestHourlyAverage: jest.fn(),
    };

    const mockExchangeRateReceiver = {
      getExchangeRates$: jest
        .fn()
        .mockReturnValue(exchangeRateSubject.asObservable()),
    };

    const mockHourlyAveragePublisher = {
      getHourlyAverages$: jest
        .fn()
        .mockReturnValue(hourlyAverageSubject.asObservable()),
    };

    mockSocket = {
      id: 'test-client-id',
      emit: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketGateway,
        {
          provide: ExchangeRateService,
          useValue: mockExchangeRateService,
        },
        {
          provide: EXCHANGE_RATE_RECEIVER,
          useValue: mockExchangeRateReceiver,
        },
        {
          provide: HOURLY_AVERAGE_PUBLISHER,
          useValue: mockHourlyAveragePublisher,
        },
      ],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
    exchangeRateService = module.get(ExchangeRateService);
    exchangeRateReceiver = module.get(EXCHANGE_RATE_RECEIVER);
    hourlyAveragePublisher = module.get(HOURLY_AVERAGE_PUBLISHER);

    // Mock server
    gateway.server = {
      emit: jest.fn(),
    } as any;
  });

  afterEach(() => {
    exchangeRateSubject.complete();
    hourlyAverageSubject.complete();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should send connection status on connect', () => {
      gateway.handleConnection(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('message', {
        type: 'connection-status',
        data: {
          status: 'connected',
          message: undefined,
        },
      });
    });

    it('should subscribe to exchange rate updates', () => {
      gateway.handleConnection(mockSocket);

      expect(exchangeRateReceiver.getExchangeRates$).toHaveBeenCalled();
    });

    it('should subscribe to hourly average updates', () => {
      gateway.handleConnection(mockSocket);

      expect(hourlyAveragePublisher.getHourlyAverages$).toHaveBeenCalled();
    });

    it('should emit exchange rate updates to client', async () => {
      gateway.handleConnection(mockSocket);

      const rate = new ExchangeRateEntity(
        'ETH/USDC' as ExchangePair,
        3436.02,
        new Date(),
      );

      exchangeRateService.getLatestHourlyAverage.mockResolvedValue(null);
      exchangeRateSubject.next(rate);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(exchangeRateService.getLatestHourlyAverage).toHaveBeenCalledWith(
        rate.pair,
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('message', {
        type: 'exchange-rate',
        data: {
          pair: rate.pair,
          price: rate.price,
          timestamp: rate.timestamp,
          hourlyAverage: undefined,
        },
      });
    });

    it('should emit hourly average updates to client', () => {
      gateway.handleConnection(mockSocket);

      const hour = new Date();
      hour.setMinutes(0, 0, 0);
      hour.setSeconds(0, 0);
      const average = new HourlyAverageEntity(
        'ETH/USDC' as ExchangePair,
        3440.38,
        hour,
        10,
      );

      hourlyAverageSubject.next(average);

      expect(mockSocket.emit).toHaveBeenCalledWith('message', {
        type: 'hourly-average',
        data: {
          pair: average.pair,
          averagePrice: average.averagePrice,
          hour: average.hour,
          sampleCount: average.sampleCount,
        },
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should unsubscribe from exchange rate updates', () => {
      const mockSubscription = { unsubscribe: jest.fn() };
      (gateway as any).exchangeRateSubscriptions.set(
        mockSocket.id,
        mockSubscription,
      );

      gateway.handleDisconnect(mockSocket);

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
      expect(
        (gateway as any).exchangeRateSubscriptions.has(mockSocket.id),
      ).toBe(false);
    });

    it('should unsubscribe from hourly average updates', () => {
      const mockSubscription = { unsubscribe: jest.fn() };
      (gateway as any).hourlyAverageSubscriptions.set(
        mockSocket.id,
        mockSubscription,
      );

      gateway.handleDisconnect(mockSocket);

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
      expect(
        (gateway as any).hourlyAverageSubscriptions.has(mockSocket.id),
      ).toBe(false);
    });

    it('should handle disconnect when no subscriptions exist', () => {
      expect(() => gateway.handleDisconnect(mockSocket)).not.toThrow();
    });
  });

  describe('handleSubscribe', () => {
    it('should send latest hourly average for specific pair', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date();
      hour.setMinutes(0, 0, 0);
      hour.setSeconds(0, 0);
      const average = new HourlyAverageEntity(pair, 3440.38, hour, 10);

      exchangeRateService.getLatestHourlyAverage.mockResolvedValue(average);

      await gateway.handleSubscribe(mockSocket, { pair });

      expect(exchangeRateService.getLatestHourlyAverage).toHaveBeenCalledWith(
        pair,
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('message', {
        type: 'hourly-average',
        data: {
          pair: average.pair,
          averagePrice: average.averagePrice,
          hour: average.hour,
          sampleCount: average.sampleCount,
        },
      });
    });

    it('should send latest hourly averages for all default pairs when no pair specified', async () => {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setSeconds(0, 0);
      const averages = DEFAULT_EXCHANGE_PAIRS.map(
        (pair) => new HourlyAverageEntity(pair, 3440.38, now, 10),
      );

      exchangeRateService.getLatestHourlyAverage
        .mockResolvedValueOnce(averages[0])
        .mockResolvedValueOnce(averages[1])
        .mockResolvedValueOnce(averages[2]);

      await gateway.handleSubscribe(mockSocket, {});

      expect(exchangeRateService.getLatestHourlyAverage).toHaveBeenCalledTimes(
        DEFAULT_EXCHANGE_PAIRS.length,
      );
      DEFAULT_EXCHANGE_PAIRS.forEach((pair) => {
        expect(exchangeRateService.getLatestHourlyAverage).toHaveBeenCalledWith(
          pair,
        );
      });
    });

    it('should not send hourly average when none exists', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      exchangeRateService.getLatestHourlyAverage.mockResolvedValue(null);

      await gateway.handleSubscribe(mockSocket, { pair });

      expect(exchangeRateService.getLatestHourlyAverage).toHaveBeenCalledWith(
        pair,
      );
      // Should not emit hourly average message
      const hourlyAverageCalls = (
        mockSocket.emit as jest.Mock
      ).mock.calls.filter((call) => call[1]?.type === 'hourly-average');
      expect(hourlyAverageCalls.length).toBe(0);
    });
  });
});
