import { CalculateHourlyAverageUseCase } from './calculate-hourly-average.use-case.js';
import { HourlyAverageCalculatorService } from '../../domain/services/hourly-average-calculator.service.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { IHourlyAveragePublisher } from '../ports/hourly-average-publisher.port.js';
import { HourlyAverageCalculatedEvent } from '../../domain/events/hourly-average-calculated.event.js';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { HourlyAverageEntity } from '../../domain/entities/hourly-average.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';
import { Subject } from 'rxjs';

describe('CalculateHourlyAverageUseCase', () => {
  let useCase: CalculateHourlyAverageUseCase;
  let mockCalculator: jest.Mocked<HourlyAverageCalculatorService>;
  let mockRepository: jest.Mocked<IExchangeRateRepository>;
  let mockPublisher: jest.Mocked<IHourlyAveragePublisher>;
  let publisherSubject: Subject<HourlyAverageEntity>;

  beforeEach(() => {
    publisherSubject = new Subject<HourlyAverageEntity>();
    mockCalculator = {
      calculate: jest.fn(),
    } as any;

    mockRepository = {
      save: jest.fn(),
      findByPair: jest.fn(),
      findByPairAndHour: jest.fn().mockResolvedValue([]),
      getLatestHourlyAverage: jest.fn(),
      saveHourlyAverage: jest.fn().mockResolvedValue(undefined),
      getAllHourlyAverages: jest.fn(),
      flushHourlyAveragesToDisk: jest.fn().mockResolvedValue(undefined),
    };

    mockPublisher = {
      getHourlyAverages$: jest.fn().mockReturnValue(publisherSubject.asObservable()),
      publish: jest.fn(),
    };

    useCase = new CalculateHourlyAverageUseCase(
      mockCalculator,
      mockRepository,
      mockPublisher
    );
  });

  describe('execute', () => {
    it('should calculate and save hourly average when rates exist', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const rates: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 1000, new Date('2024-01-01T10:00:00Z')),
        new ExchangeRateEntity(pair, 2000, new Date('2024-01-01T10:30:00Z')),
      ];

      const hourlyAverage = new HourlyAverageEntity(
        pair,
        1500,
        hour,
        2
      );

      mockRepository.findByPairAndHour.mockResolvedValue(rates);
      mockCalculator.calculate.mockReturnValue(hourlyAverage);

      const result = await useCase.execute(pair, hour);

      expect(mockRepository.findByPairAndHour).toHaveBeenCalledWith(pair, hour);
      expect(mockCalculator.calculate).toHaveBeenCalledWith(rates, pair, hour);
      expect(mockRepository.saveHourlyAverage).toHaveBeenCalledWith(
        hourlyAverage
      );
      expect(mockPublisher.publish).toHaveBeenCalledWith(hourlyAverage);
      expect(result).toBeInstanceOf(HourlyAverageCalculatedEvent);
      expect(result!.hourlyAverage).toBe(hourlyAverage);
    });

    it('should return null when no rates exist for the hour', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      mockRepository.findByPairAndHour.mockResolvedValue([]);
      mockCalculator.calculate.mockReturnValue(null);

      const result = await useCase.execute(pair, hour);

      expect(mockRepository.findByPairAndHour).toHaveBeenCalledWith(pair, hour);
      expect(mockCalculator.calculate).toHaveBeenCalledWith([], pair, hour);
      expect(mockRepository.saveHourlyAverage).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle calculator returning null', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const rates: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 1000, new Date('2024-01-01T10:00:00Z')),
      ];

      mockRepository.findByPairAndHour.mockResolvedValue(rates);
      mockCalculator.calculate.mockReturnValue(null);

      const result = await useCase.execute(pair, hour);

      expect(mockRepository.saveHourlyAverage).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const error = new Error('Repository error');
      mockRepository.findByPairAndHour.mockRejectedValue(error);

      await expect(useCase.execute(pair, hour)).rejects.toThrow(
        'Repository error'
      );
    });
  });
});
