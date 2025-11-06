import { ExchangeRateEntity } from './exchange-rate.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';

describe('ExchangeRateEntity', () => {
  describe('constructor', () => {
    it('should create an instance with valid data', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const price = 2000.5;
      const timestamp = new Date();

      const entity = new ExchangeRateEntity(pair, price, timestamp);

      expect(entity.pair).toBe(pair);
      expect(entity.price).toBe(price);
      expect(entity.timestamp).toBe(timestamp);
    });

    it('should throw error when price is zero', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const price = 0;
      const timestamp = new Date();

      expect(() => {
        new ExchangeRateEntity(pair, price, timestamp);
      }).toThrow('Exchange rate price must be positive');
    });

    it('should throw error when price is negative', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const price = -100;
      const timestamp = new Date();

      expect(() => {
        new ExchangeRateEntity(pair, price, timestamp);
      }).toThrow('Exchange rate price must be positive');
    });

    it('should throw error when timestamp is in the future', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const price = 2000;
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      expect(() => {
        new ExchangeRateEntity(pair, price, futureDate);
      }).toThrow('Exchange rate timestamp cannot be in the future');
    });
  });

  describe('isWithinHour', () => {
    it('should return true when rate is within the specified hour', () => {
      const hour = new Date('2024-01-01T10:00:00Z');
      const timestamp = new Date('2024-01-01T10:30:00Z');
      const entity = new ExchangeRateEntity('ETH/USDC', 2000, timestamp);

      const result = entity.isWithinHour(hour);

      expect(result).toBe(true);
    });

    it('should return false when rate is before the specified hour', () => {
      const hour = new Date('2024-01-01T10:00:00Z');
      const timestamp = new Date('2024-01-01T09:59:00Z');
      const entity = new ExchangeRateEntity('ETH/USDC', 2000, timestamp);

      const result = entity.isWithinHour(hour);

      expect(result).toBe(false);
    });

    it('should return false when rate is after the specified hour', () => {
      const hour = new Date('2024-01-01T10:00:00Z');
      const timestamp = new Date('2024-01-01T11:00:00Z');
      const entity = new ExchangeRateEntity('ETH/USDC', 2000, timestamp);

      const result = entity.isWithinHour(hour);

      expect(result).toBe(false);
    });

    it('should return true when rate is exactly at the start of the hour', () => {
      const hour = new Date('2024-01-01T10:00:00Z');
      const timestamp = new Date('2024-01-01T10:00:00Z');
      const entity = new ExchangeRateEntity('ETH/USDC', 2000, timestamp);

      const result = entity.isWithinHour(hour);

      expect(result).toBe(true);
    });

    it('should return false when rate is exactly at the end of the hour', () => {
      const hour = new Date('2024-01-01T10:00:00Z');
      const timestamp = new Date('2024-01-01T11:00:00Z');
      const entity = new ExchangeRateEntity('ETH/USDC', 2000, timestamp);

      const result = entity.isWithinHour(hour);

      expect(result).toBe(false);
    });
  });
});
