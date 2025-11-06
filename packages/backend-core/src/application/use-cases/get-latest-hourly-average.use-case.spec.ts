import { GetLatestHourlyAverageUseCase } from './get-latest-hourly-average.use-case.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { HourlyAverageEntity } from '../../domain/entities/hourly-average.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';

describe('GetLatestHourlyAverageUseCase', () => {
  let useCase: GetLatestHourlyAverageUseCase;
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

    useCase = new GetLatestHourlyAverageUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should return the latest hourly average when it exists', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const hourlyAverage = new HourlyAverageEntity(
        pair,
        2000,
        hour,
        100
      );

      mockRepository.getLatestHourlyAverage.mockResolvedValue(hourlyAverage);

      const result = await useCase.execute(pair);

      expect(mockRepository.getLatestHourlyAverage).toHaveBeenCalledWith(pair);
      expect(result).toBe(hourlyAverage);
    });

    it('should return null when no hourly average exists', async () => {
      const pair: ExchangePair = 'ETH/USDC';

      mockRepository.getLatestHourlyAverage.mockResolvedValue(null);

      const result = await useCase.execute(pair);

      expect(mockRepository.getLatestHourlyAverage).toHaveBeenCalledWith(pair);
      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const error = new Error('Repository error');

      mockRepository.getLatestHourlyAverage.mockRejectedValue(error);

      await expect(useCase.execute(pair)).rejects.toThrow('Repository error');
    });
  });
});
