import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from '../../src/core/core.module.js';
import {
  FileSystemExchangeRateRepository,
  ProcessExchangeRateUseCase,
  CalculateHourlyAverageUseCase,
  GetLatestHourlyAverageUseCase,
  HourlyAverageCalculatorService,
  IExchangeRateRepository,
  IHourlyAveragePublisher,
} from '@crypto-dashboard/backend-core';
import { ExchangePair } from '@crypto-dashboard/shared';
import { ExchangeRateEntity, HourlyAverageEntity } from '@crypto-dashboard/backend-core';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { EXCHANGE_RATE_REPOSITORY, HOURLY_AVERAGE_PUBLISHER } from '../../src/core/core.module.js';
import { RxJsHourlyAveragePublisher } from '@crypto-dashboard/backend-core';

describe('Hourly Average Calculation Integration', () => {
  let module: TestingModule;
  let repository: FileSystemExchangeRateRepository;
  let processUseCase: ProcessExchangeRateUseCase;
  let calculateUseCase: CalculateHourlyAverageUseCase;
  let getLatestUseCase: GetLatestHourlyAverageUseCase;
  let calculator: HourlyAverageCalculatorService;
  let publisher: IHourlyAveragePublisher;
  let testDataDir: string;
  const testPair: ExchangePair = 'ETH/USDC';

  beforeAll(async () => {
    testDataDir = join(
      tmpdir(),
      `crypto-dashboard-integration-test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
  });

  beforeEach(async () => {
    // Create fresh repository for each test
    repository = new FileSystemExchangeRateRepository(testDataDir, [testPair]);

    publisher = new RxJsHourlyAveragePublisher();
    calculator = new HourlyAverageCalculatorService();
    processUseCase = new ProcessExchangeRateUseCase(repository, publisher);
    calculateUseCase = new CalculateHourlyAverageUseCase(
      calculator,
      repository,
      publisher,
    );
    getLatestUseCase = new GetLatestHourlyAverageUseCase(repository);
  });

  afterEach(async () => {
    // Clean up test data directory
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Process Exchange Rate', () => {
    it('should save exchange rate to repository', async () => {
      const rate = new ExchangeRateEntity(testPair, 3436.02, new Date());

      await processUseCase.execute(rate);

      const savedRates = await repository.findByPair(testPair);
      expect(savedRates).toHaveLength(1);
      expect(savedRates[0].pair).toBe(testPair);
      expect(savedRates[0].price).toBe(3436.02);
    });

    it('should save multiple exchange rates', async () => {
      const rates = [
        new ExchangeRateEntity(testPair, 3436.02, new Date()),
        new ExchangeRateEntity(testPair, 3437.50, new Date()),
        new ExchangeRateEntity(testPair, 3438.75, new Date()),
      ];

      for (const rate of rates) {
        await processUseCase.execute(rate);
      }

      const savedRates = await repository.findByPair(testPair);
      expect(savedRates).toHaveLength(3);
    });
  });

  describe('Calculate Hourly Average', () => {
    it('should calculate hourly average from exchange rates', async () => {
      const now = new Date();
      const hour = new Date(now);
      hour.setMinutes(0, 0, 0);
      hour.setSeconds(0, 0);
      hour.setMilliseconds(0);

      // Add rates within the same hour (in the past)
      const rates = [
        new ExchangeRateEntity(
          testPair,
          3436.02,
          new Date(hour.getTime() + 10 * 60 * 1000), // 10 minutes into the hour
        ),
        new ExchangeRateEntity(
          testPair,
          3437.50,
          new Date(hour.getTime() + 20 * 60 * 1000), // 20 minutes into the hour
        ),
        new ExchangeRateEntity(
          testPair,
          3438.75,
          new Date(hour.getTime() + 30 * 60 * 1000), // 30 minutes into the hour
        ),
      ];

      for (const rate of rates) {
        await processUseCase.execute(rate);
      }

      const result = await calculateUseCase.execute(testPair, hour);

      expect(result).not.toBeNull();
      expect(result?.hourlyAverage.pair).toBe(testPair);
      expect(result?.hourlyAverage.averagePrice).toBeCloseTo(
        (3436.02 + 3437.5 + 3438.75) / 3,
        2,
      );
      expect(result?.hourlyAverage.sampleCount).toBe(3);
    });

    it('should persist hourly average to file', async () => {
      const hour = new Date();
      hour.setMinutes(0, 0, 0);
      hour.setSeconds(0, 0);
      hour.setMilliseconds(0);

      const now = new Date();
      const rates = [
        new ExchangeRateEntity(
          testPair,
          3436.02,
          new Date(now.getTime() - 50 * 60 * 1000), // 50 minutes ago
        ),
        new ExchangeRateEntity(
          testPair,
          3437.50,
          new Date(now.getTime() - 40 * 60 * 1000), // 40 minutes ago
        ),
      ];

      for (const rate of rates) {
        await processUseCase.execute(rate);
      }

      await calculateUseCase.execute(testPair, hour);

      // Verify it was persisted by creating a new repository instance
      const newRepository = new FileSystemExchangeRateRepository(testDataDir, [
        testPair,
      ]);
      const savedAverage = await newRepository.getLatestHourlyAverage(testPair);

      expect(savedAverage).not.toBeNull();
      expect(savedAverage?.pair).toBe(testPair);
      expect(savedAverage?.averagePrice).toBeCloseTo(
        (3436.02 + 3437.5) / 2,
        2,
      );
    });

    it('should return null when no rates exist for the hour', async () => {
      const hour = new Date();
      hour.setMinutes(0, 0, 0);
      hour.setSeconds(0, 0);
      hour.setMilliseconds(0);

      const result = await calculateUseCase.execute(testPair, hour);

      expect(result).toBeNull();
    });

    it('should filter rates by hour correctly', async () => {
      // Use past dates to avoid "timestamp in future" validation error
      const hour1 = new Date('2024-01-01T10:00:00Z');
      hour1.setMinutes(0, 0, 0);
      hour1.setSeconds(0, 0);
      hour1.setMilliseconds(0);

      const hour2 = new Date('2024-01-01T11:00:00Z');
      hour2.setMinutes(0, 0, 0);
      hour2.setSeconds(0, 0);
      hour2.setMilliseconds(0);

      // Add rates for hour1
      const ratesHour1 = [
        new ExchangeRateEntity(
          testPair,
          3436.02,
          new Date(hour1.getTime() + 10 * 60 * 1000),
        ),
        new ExchangeRateEntity(
          testPair,
          3437.50,
          new Date(hour1.getTime() + 20 * 60 * 1000),
        ),
      ];

      // Add rates for hour2
      const ratesHour2 = [
        new ExchangeRateEntity(
          testPair,
          3500.00,
          new Date(hour2.getTime() + 10 * 60 * 1000),
        ),
      ];

      for (const rate of [...ratesHour1, ...ratesHour2]) {
        await processUseCase.execute(rate);
      }

      const result1 = await calculateUseCase.execute(testPair, hour1);
      const result2 = await calculateUseCase.execute(testPair, hour2);

      expect(result1).not.toBeNull();
      expect(result1?.hourlyAverage.sampleCount).toBe(2);
      expect(result1?.hourlyAverage.averagePrice).toBeCloseTo(
        (3436.02 + 3437.5) / 2,
        2,
      );

      expect(result2).not.toBeNull();
      expect(result2?.hourlyAverage.sampleCount).toBe(1);
      expect(result2?.hourlyAverage.averagePrice).toBe(3500.00);
    });
  });

  describe('Get Latest Hourly Average', () => {
    it('should return latest hourly average', async () => {
      const hour1 = new Date('2024-01-01T10:00:00Z');
      hour1.setMinutes(0, 0, 0);
      hour1.setSeconds(0, 0);
      hour1.setMilliseconds(0);

      const hour2 = new Date('2024-01-01T11:00:00Z');
      hour2.setMinutes(0, 0, 0);
      hour2.setSeconds(0, 0);
      hour2.setMilliseconds(0);

      // Create and save averages directly
      const average1 = new HourlyAverageEntity(testPair, 3436.02, hour1, 10);
      const average2 = new HourlyAverageEntity(testPair, 3500.00, hour2, 15);

      await repository.saveHourlyAverage(average1);
      await repository.saveHourlyAverage(average2);

      const latest = await getLatestUseCase.execute(testPair);

      expect(latest).not.toBeNull();
      expect(latest?.hour.getTime()).toBe(hour2.getTime());
      expect(latest?.averagePrice).toBe(3500.00);
    });

    it('should return null when no averages exist', async () => {
      const latest = await getLatestUseCase.execute(testPair);
      expect(latest).toBeNull();
    });
  });

  describe('End-to-End Flow', () => {
    it('should process rates, calculate average, and retrieve it', async () => {
      const hour = new Date();
      hour.setMinutes(0, 0, 0);
      hour.setSeconds(0, 0);
      hour.setMilliseconds(0);

      // Step 1: Process exchange rates
      const now = new Date();
      const rates = [
        new ExchangeRateEntity(
          testPair,
          3436.02,
          new Date(now.getTime() - 50 * 60 * 1000), // 50 minutes ago
        ),
        new ExchangeRateEntity(
          testPair,
          3437.50,
          new Date(now.getTime() - 40 * 60 * 1000), // 40 minutes ago
        ),
        new ExchangeRateEntity(
          testPair,
          3438.75,
          new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
        ),
      ];

      for (const rate of rates) {
        await processUseCase.execute(rate);
      }

      // Step 2: Calculate hourly average
      const calculationResult = await calculateUseCase.execute(testPair, hour);
      expect(calculationResult).not.toBeNull();

      // Step 3: Retrieve latest hourly average
      const latest = await getLatestUseCase.execute(testPair);
      expect(latest).not.toBeNull();
      expect(latest?.pair).toBe(testPair);
      expect(latest?.averagePrice).toBeCloseTo(
        (3436.02 + 3437.5 + 3438.75) / 3,
        2,
      );
      expect(latest?.sampleCount).toBe(3);
    });
  });
});

