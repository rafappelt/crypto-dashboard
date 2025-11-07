import { PersistHourlyAveragesUseCase } from './persist-hourly-averages.use-case.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { ILogger } from '../ports/logger.port.js';

describe('PersistHourlyAveragesUseCase', () => {
  let useCase: PersistHourlyAveragesUseCase;
  let mockRepository: jest.Mocked<IExchangeRateRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByPair: jest.fn(),
      findByPairAndHour: jest.fn(),
      getLatestHourlyAverage: jest.fn(),
      saveHourlyAverage: jest.fn(),
      getAllHourlyAverages: jest.fn(),
      flushHourlyAveragesToDisk: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    useCase = new PersistHourlyAveragesUseCase(mockRepository, mockLogger);
  });

  describe('execute', () => {
    it('should flush hourly averages to disk', async () => {
      mockRepository.flushHourlyAveragesToDisk.mockResolvedValue(undefined);

      await useCase.execute();

      expect(mockRepository.flushHourlyAveragesToDisk).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Successfully persisted hourly averages to disk'
      );
    });

    it('should log error when flush fails', async () => {
      const error = new Error('Disk write error');
      mockRepository.flushHourlyAveragesToDisk.mockRejectedValue(error);

      await expect(useCase.execute()).rejects.toThrow('Disk write error');

      expect(mockRepository.flushHourlyAveragesToDisk).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to persist hourly averages to disk',
        error
      );
    });

    it('should not affect repository when called multiple times', async () => {
      mockRepository.flushHourlyAveragesToDisk.mockResolvedValue(undefined);

      await useCase.execute();
      await useCase.execute();
      await useCase.execute();

      expect(mockRepository.flushHourlyAveragesToDisk).toHaveBeenCalledTimes(3);
    });
  });
});

