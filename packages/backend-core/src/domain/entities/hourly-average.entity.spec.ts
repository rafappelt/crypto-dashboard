import { HourlyAverageEntity } from './hourly-average.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';

describe('HourlyAverageEntity', () => {
  describe('constructor', () => {
    it('should create an instance with valid data', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const averagePrice = 2000.5;
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);
      const sampleCount = 100;

      const entity = new HourlyAverageEntity(
        pair,
        averagePrice,
        hour,
        sampleCount
      );

      expect(entity.pair).toBe(pair);
      expect(entity.averagePrice).toBe(averagePrice);
      expect(entity.hour).toBe(hour);
      expect(entity.sampleCount).toBe(sampleCount);
    });

    it('should throw error when averagePrice is zero', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const averagePrice = 0;
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);
      const sampleCount = 100;

      expect(() => {
        new HourlyAverageEntity(pair, averagePrice, hour, sampleCount);
      }).toThrow('Hourly average price must be positive');
    });

    it('should throw error when averagePrice is negative', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const averagePrice = -100;
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);
      const sampleCount = 100;

      expect(() => {
        new HourlyAverageEntity(pair, averagePrice, hour, sampleCount);
      }).toThrow('Hourly average price must be positive');
    });

    it('should throw error when sampleCount is zero', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const averagePrice = 2000;
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);
      const sampleCount = 0;

      expect(() => {
        new HourlyAverageEntity(pair, averagePrice, hour, sampleCount);
      }).toThrow('Sample count must be positive');
    });

    it('should throw error when sampleCount is negative', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const averagePrice = 2000;
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);
      const sampleCount = -10;

      expect(() => {
        new HourlyAverageEntity(pair, averagePrice, hour, sampleCount);
      }).toThrow('Sample count must be positive');
    });

    it('should throw error when hour is not at the start of the hour', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const averagePrice = 2000;
      const hour = new Date('2024-01-01T10:30:00Z');
      const sampleCount = 100;

      expect(() => {
        new HourlyAverageEntity(pair, averagePrice, hour, sampleCount);
      }).toThrow('Hour must be at the start of the hour');
    });
  });

  describe('getKey', () => {
    it('should return a unique key for the entity', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const averagePrice = 2000;
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);
      const sampleCount = 100;

      const entity = new HourlyAverageEntity(
        pair,
        averagePrice,
        hour,
        sampleCount
      );

      const key = entity.getKey();
      expect(key).toBe('ETH/USDC-2024-01-01T10:00:00.000Z');
    });

    it('should return different keys for different pairs', () => {
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const entity1 = new HourlyAverageEntity('ETH/USDC', 2000, hour, 100);
      const entity2 = new HourlyAverageEntity('ETH/USDT', 2000, hour, 100);

      expect(entity1.getKey()).not.toBe(entity2.getKey());
    });

    it('should return different keys for different hours', () => {
      const hour1 = new Date('2024-01-01T10:00:00Z');
      hour1.setMinutes(0, 0, 0);
      hour1.setMilliseconds(0);

      const hour2 = new Date('2024-01-01T11:00:00Z');
      hour2.setMinutes(0, 0, 0);
      hour2.setMilliseconds(0);

      const entity1 = new HourlyAverageEntity('ETH/USDC', 2000, hour1, 100);
      const entity2 = new HourlyAverageEntity('ETH/USDC', 2000, hour2, 100);

      expect(entity1.getKey()).not.toBe(entity2.getKey());
    });
  });
});
