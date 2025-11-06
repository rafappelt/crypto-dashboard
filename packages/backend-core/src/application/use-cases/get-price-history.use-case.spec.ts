import { GetPriceHistoryUseCase } from './get-price-history.use-case.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';

describe('GetPriceHistoryUseCase', () => {
  let useCase: GetPriceHistoryUseCase;
  let mockRepository: jest.Mocked<IExchangeRateRepository>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByPair: jest.fn(),
      findByPairAndHour: jest.fn(),
      getLatestHourlyAverage: jest.fn(),
      saveHourlyAverage: jest.fn(),
      getAllHourlyAverages: jest.fn(),
    };

    useCase = new GetPriceHistoryUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should return price history with default limit', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const rates: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 2000, new Date()),
        new ExchangeRateEntity(pair, 2100, new Date()),
      ];

      mockRepository.findByPair.mockResolvedValue(rates);

      const result = await useCase.execute(pair);

      expect(mockRepository.findByPair).toHaveBeenCalledWith(pair, 100);
      expect(result).toBe(rates);
    });

    it('should return price history with custom limit', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const limit = 50;
      const rates: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 2000, new Date()),
      ];

      mockRepository.findByPair.mockResolvedValue(rates);

      const result = await useCase.execute(pair, limit);

      expect(mockRepository.findByPair).toHaveBeenCalledWith(pair, limit);
      expect(result).toBe(rates);
    });

    it('should return empty array when no history exists', async () => {
      const pair: ExchangePair = 'ETH/USDC';

      mockRepository.findByPair.mockResolvedValue([]);

      const result = await useCase.execute(pair);

      expect(mockRepository.findByPair).toHaveBeenCalledWith(pair, 100);
      expect(result).toEqual([]);
    });

    it('should handle repository errors', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const error = new Error('Repository error');

      mockRepository.findByPair.mockRejectedValue(error);

      await expect(useCase.execute(pair)).rejects.toThrow('Repository error');
    });
  });
});
