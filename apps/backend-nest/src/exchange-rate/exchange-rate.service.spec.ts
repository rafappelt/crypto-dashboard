import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRateService } from './exchange-rate.service.js';
import {
  GetLatestHourlyAverageUseCase,
  GetPriceHistoryUseCase,
  HourlyAverageEntity,
  ExchangeRateEntity,
} from '@crypto-dashboard/backend-core';
import { ExchangePair } from '@crypto-dashboard/shared';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let getLatestHourlyAverageUseCase: jest.Mocked<GetLatestHourlyAverageUseCase>;
  let getPriceHistoryUseCase: jest.Mocked<GetPriceHistoryUseCase>;

  beforeEach(async () => {
    const mockGetLatestHourlyAverageUseCase = {
      execute: jest.fn(),
    };

    const mockGetPriceHistoryUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        {
          provide: GetLatestHourlyAverageUseCase,
          useValue: mockGetLatestHourlyAverageUseCase,
        },
        {
          provide: GetPriceHistoryUseCase,
          useValue: mockGetPriceHistoryUseCase,
        },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
    getLatestHourlyAverageUseCase = module.get(GetLatestHourlyAverageUseCase);
    getPriceHistoryUseCase = module.get(GetPriceHistoryUseCase);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLatestHourlyAverage', () => {
    it('should return hourly average from use case', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2025-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setSeconds(0, 0);
      const expectedAverage = new HourlyAverageEntity(pair, 3440.38, hour, 10);

      getLatestHourlyAverageUseCase.execute.mockResolvedValue(expectedAverage);

      const result = await service.getLatestHourlyAverage(pair);

      expect(result).toEqual(expectedAverage);
      expect(getLatestHourlyAverageUseCase.execute).toHaveBeenCalledWith(pair);
      expect(getLatestHourlyAverageUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return null when use case returns null', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      getLatestHourlyAverageUseCase.execute.mockResolvedValue(null);

      const result = await service.getLatestHourlyAverage(pair);

      expect(result).toBeNull();
      expect(getLatestHourlyAverageUseCase.execute).toHaveBeenCalledWith(pair);
    });

    it('should handle different pairs', async () => {
      const pair1: ExchangePair = 'ETH/USDC';
      const pair2: ExchangePair = 'ETH/USDT';
      const hour1 = new Date();
      hour1.setMinutes(0, 0, 0);
      hour1.setSeconds(0, 0);
      const hour2 = new Date();
      hour2.setMinutes(0, 0, 0);
      hour2.setSeconds(0, 0);
      const average1 = new HourlyAverageEntity(pair1, 3440.38, hour1, 10);
      const average2 = new HourlyAverageEntity(pair2, 3450.5, hour2, 15);

      getLatestHourlyAverageUseCase.execute
        .mockResolvedValueOnce(average1)
        .mockResolvedValueOnce(average2);

      const result1 = await service.getLatestHourlyAverage(pair1);
      const result2 = await service.getLatestHourlyAverage(pair2);

      expect(result1).toEqual(average1);
      expect(result2).toEqual(average2);
      expect(getLatestHourlyAverageUseCase.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPriceHistory', () => {
    it('should return price history from use case with default limit', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const expectedHistory: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 3400, new Date('2025-01-01T10:00:00Z')),
        new ExchangeRateEntity(pair, 3450, new Date('2025-01-01T10:01:00Z')),
      ];

      getPriceHistoryUseCase.execute.mockResolvedValue(expectedHistory);

      const result = await service.getPriceHistory(pair);

      expect(result).toEqual(expectedHistory);
      expect(getPriceHistoryUseCase.execute).toHaveBeenCalledWith(pair, 100);
      expect(getPriceHistoryUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return price history with custom limit', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const limit = 50;
      const expectedHistory: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 3400, new Date('2025-01-01T10:00:00Z')),
      ];

      getPriceHistoryUseCase.execute.mockResolvedValue(expectedHistory);

      const result = await service.getPriceHistory(pair, limit);

      expect(result).toEqual(expectedHistory);
      expect(getPriceHistoryUseCase.execute).toHaveBeenCalledWith(pair, limit);
    });

    it('should return empty array when no history exists', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      getPriceHistoryUseCase.execute.mockResolvedValue([]);

      const result = await service.getPriceHistory(pair);

      expect(result).toEqual([]);
      expect(getPriceHistoryUseCase.execute).toHaveBeenCalledWith(pair, 100);
    });
  });
});
