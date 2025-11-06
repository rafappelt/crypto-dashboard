import { ProcessExchangeRateUseCase } from './process-exchange-rate.use-case.js';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { ExchangeRateReceivedEvent } from '../../domain/events/exchange-rate-received.event.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { IHourlyAveragePublisher } from '../ports/hourly-average-publisher.port.js';
import { ExchangePair } from '@crypto-dashboard/shared';

describe('ProcessExchangeRateUseCase', () => {
  let useCase: ProcessExchangeRateUseCase;
  let mockRepository: jest.Mocked<IExchangeRateRepository>;
  let mockPublisher: jest.Mocked<IHourlyAveragePublisher>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findByPair: jest.fn(),
      findByPairAndHour: jest.fn(),
      getLatestHourlyAverage: jest.fn(),
      saveHourlyAverage: jest.fn(),
      getAllHourlyAverages: jest.fn(),
    };

    mockPublisher = {
      getHourlyAverages$: jest.fn(),
      publish: jest.fn(),
    };

    useCase = new ProcessExchangeRateUseCase(mockRepository, mockPublisher);
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
