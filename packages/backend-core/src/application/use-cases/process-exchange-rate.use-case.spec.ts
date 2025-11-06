import { ProcessExchangeRateUseCase } from './process-exchange-rate.use-case.js';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { ExchangeRateReceivedEvent } from '../../domain/events/exchange-rate-received.event.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { ILogger } from '../ports/logger.port.js';
import { CalculateHourlyAverageUseCase } from './calculate-hourly-average.use-case.js';
import { ExchangePair } from '@crypto-dashboard/shared';

describe('ProcessExchangeRateUseCase', () => {
  let useCase: ProcessExchangeRateUseCase;
  let mockRepository: jest.Mocked<IExchangeRateRepository>;
  let mockCalculateHourlyAverage: jest.Mocked<CalculateHourlyAverageUseCase>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findByPair: jest.fn(),
      findByPairAndHour: jest.fn(),
      getLatestHourlyAverage: jest.fn(),
      saveHourlyAverage: jest.fn(),
      getAllHourlyAverages: jest.fn(),
    };

    mockCalculateHourlyAverage = {
      execute: jest.fn().mockResolvedValue(null),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    useCase = new ProcessExchangeRateUseCase(
      mockRepository, 
      mockCalculateHourlyAverage,
      mockLogger
    );
  });

  describe('execute', () => {
    it('should save the exchange rate and return an event', async () => {
      const exchangeRate = new ExchangeRateEntity(
        'ETH/USDC',
        2000,
        new Date()
      );

      const result = await useCase.execute(exchangeRate);

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(exchangeRate);
      expect(result).toBeInstanceOf(ExchangeRateReceivedEvent);
      expect(result.exchangeRate).toBe(exchangeRate);
      expect(result.occurredAt).toBeInstanceOf(Date);
    });

    it('should calculate hourly average immediately after saving', async () => {
      const timestamp = new Date('2025-11-06T15:30:00.000Z');
      const exchangeRate = new ExchangeRateEntity(
        'ETH/USDC',
        2000,
        timestamp
      );

      await useCase.execute(exchangeRate);

      expect(mockCalculateHourlyAverage.execute).toHaveBeenCalledTimes(1);
      expect(mockCalculateHourlyAverage.execute).toHaveBeenCalledWith(
        'ETH/USDC',
        new Date('2025-11-06T15:00:00.000Z')
      );
    });

    it('should not fail if hourly average calculation throws error', async () => {
      const exchangeRate = new ExchangeRateEntity(
        'ETH/USDC',
        2000,
        new Date()
      );
      const calculationError = new Error('Calculation error');
      mockCalculateHourlyAverage.execute.mockRejectedValue(calculationError);

      const result = await useCase.execute(exchangeRate);

      expect(result).toBeInstanceOf(ExchangeRateReceivedEvent);
      expect(mockRepository.save).toHaveBeenCalledWith(exchangeRate);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to calculate hourly average for ETH/USDC',
        calculationError
      );
    });

    it('should handle repository errors', async () => {
      const exchangeRate = new ExchangeRateEntity(
        'ETH/USDC',
        2000,
        new Date()
      );
      const error = new Error('Repository error');
      mockRepository.save.mockRejectedValue(error);

      await expect(useCase.execute(exchangeRate)).rejects.toThrow(
        'Repository error'
      );
    });

    it('should process different exchange pairs', async () => {
      const pairs: ExchangePair[] = ['ETH/USDC', 'ETH/USDT', 'ETH/BTC'];

      for (const pair of pairs) {
        const exchangeRate = new ExchangeRateEntity(pair, 2000, new Date());
        await useCase.execute(exchangeRate);
      }

      expect(mockRepository.save).toHaveBeenCalledTimes(3);
    });
  });
});
