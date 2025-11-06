import { FileSystemExchangeRateRepository } from './file-system-exchange-rate.repository.js';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { HourlyAverageEntity } from '../../domain/entities/hourly-average.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FileSystemExchangeRateRepository', () => {
  let repository: FileSystemExchangeRateRepository;
  let testDataDir: string;
  const pairs: ExchangePair[] = ['ETH/USDC', 'ETH/USDT', 'ETH/BTC'];

  beforeEach(async () => {
    // Create a unique temporary directory for each test
    testDataDir = join(tmpdir(), `crypto-dashboard-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    repository = new FileSystemExchangeRateRepository(testDataDir, pairs);
    // Wait for directory creation
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    // Clean up test data directory
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('save', () => {
    it('should save an exchange rate', async () => {
      const rate = new ExchangeRateEntity('ETH/USDC', 2000, new Date());

      await repository.save(rate);

      const history = await repository.findByPair('ETH/USDC');
      expect(history).toHaveLength(1);
      expect(history[0].pair).toBe(rate.pair);
      expect(history[0].price).toBe(rate.price);
    });

    it('should keep only last hour of data (max 3600 entries)', async () => {
      const pair: ExchangePair = 'ETH/USDC';

      // Add more than 3600 rates
      for (let i = 0; i < 3700; i++) {
        const rate = new ExchangeRateEntity(
          pair,
          2000 + i,
          new Date(Date.now() - (3700 - i) * 1000)
        );
        await repository.save(rate);
      }

      const history = await repository.findByPair(pair);
      expect(history.length).toBeLessThanOrEqual(3600);
      // Should keep the most recent ones
      expect(history[history.length - 1].price).toBe(5699);
    });
  });

  describe('findByPair', () => {
    it('should return empty array when no rates exist', async () => {
      const result = await repository.findByPair('ETH/USDC');
      expect(result).toEqual([]);
    });

    it('should return rates for a specific pair', async () => {
      const rate1 = new ExchangeRateEntity('ETH/USDC', 2000, new Date());
      const rate2 = new ExchangeRateEntity('ETH/USDC', 2100, new Date());
      const rate3 = new ExchangeRateEntity('ETH/USDT', 3000, new Date());

      await repository.save(rate1);
      await repository.save(rate2);
      await repository.save(rate3);

      const result = await repository.findByPair('ETH/USDC');
      expect(result).toHaveLength(2);
      expect(result[0].price).toBe(2000);
      expect(result[1].price).toBe(2100);
    });

    it('should return limited results when limit is specified', async () => {
      const pair: ExchangePair = 'ETH/USDC';

      for (let i = 0; i < 150; i++) {
        const rate = new ExchangeRateEntity(pair, 2000 + i, new Date());
        await repository.save(rate);
      }

      const result = await repository.findByPair(pair, 100);
      expect(result).toHaveLength(100);
    });
  });

  describe('findByPairAndHour', () => {
    it('should return rates within the specified hour', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const withinHour = [
        new ExchangeRateEntity(pair, 2000, new Date('2024-01-01T10:00:00Z')),
        new ExchangeRateEntity(pair, 2100, new Date('2024-01-01T10:30:00Z')),
      ];

      const outsideHour = [
        new ExchangeRateEntity(pair, 2200, new Date('2024-01-01T09:59:00Z')),
        new ExchangeRateEntity(pair, 2300, new Date('2024-01-01T11:00:00Z')),
      ];

      for (const rate of [...withinHour, ...outsideHour]) {
        await repository.save(rate);
      }

      const result = await repository.findByPairAndHour(pair, hour);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.price)).toEqual(expect.arrayContaining([2000, 2100]));
    });
  });

  describe('saveHourlyAverage', () => {
    it('should save a hourly average to file', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const average = new HourlyAverageEntity(pair, 2000, hour, 100);

      await repository.saveHourlyAverage(average);

      // Verify it was saved to file
      const result = await repository.getLatestHourlyAverage(pair);
      expect(result).not.toBeNull();
      expect(result?.pair).toBe(pair);
      expect(result?.averagePrice).toBe(2000);
      expect(result?.sampleCount).toBe(100);
    });

    it('should persist across repository instances', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const average = new HourlyAverageEntity(pair, 2000, hour, 100);

      await repository.saveHourlyAverage(average);

      // Create a new repository instance pointing to the same directory
      const newRepository = new FileSystemExchangeRateRepository(testDataDir, pairs);

      const result = await newRepository.getLatestHourlyAverage(pair);
      expect(result).not.toBeNull();
      expect(result?.pair).toBe(pair);
      expect(result?.averagePrice).toBe(2000);
    });
  });

  describe('getLatestHourlyAverage', () => {
    it('should return null when no averages exist', async () => {
      const result = await repository.getLatestHourlyAverage('ETH/USDC');
      expect(result).toBeNull();
    });

    it('should return the latest hourly average', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour1 = new Date('2024-01-01T10:00:00Z');
      hour1.setMinutes(0, 0, 0);
      hour1.setMilliseconds(0);

      const hour2 = new Date('2024-01-01T11:00:00Z');
      hour2.setMinutes(0, 0, 0);
      hour2.setMilliseconds(0);

      const average1 = new HourlyAverageEntity(pair, 2000, hour1, 100);
      const average2 = new HourlyAverageEntity(pair, 2100, hour2, 100);

      await repository.saveHourlyAverage(average1);
      await repository.saveHourlyAverage(average2);

      const result = await repository.getLatestHourlyAverage(pair);
      expect(result).not.toBeNull();
      expect(result?.averagePrice).toBe(2100);
      expect(result?.hour.getTime()).toBe(hour2.getTime());
    });

    it('should return latest average for specific pair only', async () => {
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const average1 = new HourlyAverageEntity('ETH/USDC', 2000, hour, 100);
      const average2 = new HourlyAverageEntity('ETH/USDT', 3000, hour, 100);

      await repository.saveHourlyAverage(average1);
      await repository.saveHourlyAverage(average2);

      const result = await repository.getLatestHourlyAverage('ETH/USDC');
      expect(result).not.toBeNull();
      expect(result?.pair).toBe('ETH/USDC');
      expect(result?.averagePrice).toBe(2000);
    });
  });

  describe('getAllHourlyAverages', () => {
    it('should return all averages for a pair sorted by hour descending', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour1 = new Date('2024-01-01T10:00:00Z');
      hour1.setMinutes(0, 0, 0);
      hour1.setMilliseconds(0);

      const hour2 = new Date('2024-01-01T11:00:00Z');
      hour2.setMinutes(0, 0, 0);
      hour2.setMilliseconds(0);

      const hour3 = new Date('2024-01-01T12:00:00Z');
      hour3.setMinutes(0, 0, 0);
      hour3.setMilliseconds(0);

      const average1 = new HourlyAverageEntity(pair, 2000, hour1, 100);
      const average2 = new HourlyAverageEntity(pair, 2100, hour2, 100);
      const average3 = new HourlyAverageEntity(pair, 2200, hour3, 100);

      await repository.saveHourlyAverage(average1);
      await repository.saveHourlyAverage(average2);
      await repository.saveHourlyAverage(average3);

      const result = await repository.getAllHourlyAverages(pair);
      expect(result).toHaveLength(3);
      expect(result[0].averagePrice).toBe(2200); // Most recent first
      expect(result[1].averagePrice).toBe(2100);
      expect(result[2].averagePrice).toBe(2000);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent saveHourlyAverage calls without data corruption', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const baseHour = new Date('2024-01-01T10:00:00Z');
      baseHour.setMinutes(0, 0, 0);
      baseHour.setMilliseconds(0);

      // Create 20 different hourly averages with unique hours
      const averages = Array.from({ length: 20 }, (_, i) => {
        const hour = new Date(baseHour);
        hour.setHours(hour.getHours() + i);
        return new HourlyAverageEntity(pair, 2000 + i * 100, hour, 100 + i);
      });

      // Save all averages concurrently
      await Promise.all(averages.map((avg) => repository.saveHourlyAverage(avg)));

      // Verify all were saved correctly
      const allAverages = await repository.getAllHourlyAverages(pair);
      expect(allAverages).toHaveLength(20);

      // Verify each average was saved with correct data
      for (let i = 0; i < 20; i++) {
        const expectedPrice = 2000 + i * 100;
        const expectedCount = 100 + i;
        const found = allAverages.find((avg) => avg.averagePrice === expectedPrice);
        expect(found).toBeDefined();
        expect(found?.sampleCount).toBe(expectedCount);
      }
    });

    it('should handle concurrent saveHourlyAverage and read operations', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const baseHour = new Date('2024-01-01T10:00:00Z');
      baseHour.setMinutes(0, 0, 0);
      baseHour.setMilliseconds(0);

      // Start concurrent writes and reads
      const writePromises = Array.from({ length: 10 }, (_, i) => {
        const hour = new Date(baseHour);
        hour.setHours(hour.getHours() + i);
        const average = new HourlyAverageEntity(pair, 2000 + i * 100, hour, 100);
        return repository.saveHourlyAverage(average);
      });

      const readPromises = Array.from({ length: 10 }, () =>
        repository.getLatestHourlyAverage(pair)
      );

      // All operations should complete without error
      await expect(Promise.all([...writePromises, ...readPromises])).resolves.not.toThrow();

      // Verify final state is correct
      const allAverages = await repository.getAllHourlyAverages(pair);
      expect(allAverages).toHaveLength(10);
    });
  });
});

