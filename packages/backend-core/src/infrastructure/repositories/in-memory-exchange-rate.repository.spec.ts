import { InMemoryExchangeRateRepository } from './in-memory-exchange-rate.repository.js';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { HourlyAverageEntity } from '../../domain/entities/hourly-average.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';

describe('InMemoryExchangeRateRepository', () => {
  let repository: InMemoryExchangeRateRepository;
  const pairs: ExchangePair[] = ['ETH/USDC', 'ETH/USDT', 'ETH/BTC'];

  beforeEach(() => {
    repository = new InMemoryExchangeRateRepository(pairs);
  });

  describe('save', () => {
    it('should save an exchange rate', async () => {
      const rate = new ExchangeRateEntity('ETH/USDC', 2000, new Date());

      await repository.save(rate);

      const history = await repository.findByPair('ETH/USDC');
      expect(history).toHaveLength(1);
      expect(history[0]).toBe(rate);
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
      expect(result).toContain(rate1);
      expect(result).toContain(rate2);
      expect(result).not.toContain(rate3);
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
      expect(result).toEqual(expect.arrayContaining(withinHour));
    });
  });

  describe('saveHourlyAverage', () => {
    it('should save a hourly average', async () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const average = new HourlyAverageEntity(pair, 2000, hour, 100);

      await repository.saveHourlyAverage(average);

      const result = await repository.getLatestHourlyAverage(pair);
      expect(result).toBe(average);
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
      expect(result).toBe(average2);
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
      expect(result).toBe(average1);
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
      expect(result[0]).toBe(average3); // Most recent first
      expect(result[1]).toBe(average2);
      expect(result[2]).toBe(average1);
    });
  });
});
