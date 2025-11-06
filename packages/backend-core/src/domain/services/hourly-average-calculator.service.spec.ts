import { HourlyAverageCalculatorService } from './hourly-average-calculator.service.js';
import { ExchangeRateEntity } from '../entities/exchange-rate.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';

describe('HourlyAverageCalculatorService', () => {
  let service: HourlyAverageCalculatorService;

  beforeEach(() => {
    service = new HourlyAverageCalculatorService();
  });

  describe('calculate', () => {
    it('should calculate average correctly for rates within the hour', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const rates: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 1000, new Date('2024-01-01T10:00:00Z')),
        new ExchangeRateEntity(pair, 2000, new Date('2024-01-01T10:15:00Z')),
        new ExchangeRateEntity(pair, 3000, new Date('2024-01-01T10:30:00Z')),
      ];

      const result = service.calculate(rates, pair, hour);

      expect(result).not.toBeNull();
      expect(result!.pair).toBe(pair);
      expect(result!.averagePrice).toBe(2000);
      expect(result!.sampleCount).toBe(3);
      expect(result!.hour.getTime()).toBe(hour.getTime());
    });

    it('should filter out rates not within the hour', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const rates: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 1000, new Date('2024-01-01T10:00:00Z')),
        new ExchangeRateEntity(pair, 2000, new Date('2024-01-01T10:30:00Z')),
        new ExchangeRateEntity(pair, 3000, new Date('2024-01-01T09:59:00Z')), // Before hour
        new ExchangeRateEntity(pair, 4000, new Date('2024-01-01T11:00:00Z')), // After hour
      ];

      const result = service.calculate(rates, pair, hour);

      expect(result).not.toBeNull();
      expect(result!.averagePrice).toBe(1500); // (1000 + 2000) / 2
      expect(result!.sampleCount).toBe(2);
    });

    it('should filter out rates for different pairs', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const rates: ExchangeRateEntity[] = [
        new ExchangeRateEntity('ETH/USDC', 1000, new Date('2024-01-01T10:00:00Z')),
        new ExchangeRateEntity('ETH/USDT', 2000, new Date('2024-01-01T10:15:00Z')), // Different pair
        new ExchangeRateEntity('ETH/USDC', 3000, new Date('2024-01-01T10:30:00Z')),
      ];

      const result = service.calculate(rates, pair, hour);

      expect(result).not.toBeNull();
      expect(result!.averagePrice).toBe(2000); // (1000 + 3000) / 2
      expect(result!.sampleCount).toBe(2);
    });

    it('should return null when no rates match the criteria', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const rates: ExchangeRateEntity[] = [];

      const result = service.calculate(rates, pair, hour);

      expect(result).toBeNull();
    });

    it('should return null when all rates are outside the hour', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const rates: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 1000, new Date('2024-01-01T09:00:00Z')),
        new ExchangeRateEntity(pair, 2000, new Date('2024-01-01T11:00:00Z')),
      ];

      const result = service.calculate(rates, pair, hour);

      expect(result).toBeNull();
    });

    it('should normalize hour to start of the hour', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:30:45Z'); // Not at start of hour

      const rates: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 1000, new Date('2024-01-01T10:00:00Z')),
        new ExchangeRateEntity(pair, 2000, new Date('2024-01-01T10:30:00Z')),
      ];

      const result = service.calculate(rates, pair, hour);

      expect(result).not.toBeNull();
      expect(result!.hour.getMinutes()).toBe(0);
      expect(result!.hour.getSeconds()).toBe(0);
      expect(result!.hour.getMilliseconds()).toBe(0);
    });

    it('should handle single rate correctly', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const hour = new Date('2024-01-01T10:00:00Z');
      hour.setMinutes(0, 0, 0);
      hour.setMilliseconds(0);

      const rates: ExchangeRateEntity[] = [
        new ExchangeRateEntity(pair, 2500, new Date('2024-01-01T10:15:00Z')),
      ];

      const result = service.calculate(rates, pair, hour);

      expect(result).not.toBeNull();
      expect(result!.averagePrice).toBe(2500);
      expect(result!.sampleCount).toBe(1);
    });
  });
});
