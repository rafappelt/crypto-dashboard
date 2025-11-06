import { ExchangeRateService } from './exchange-rate-service.js';
import { ExchangeRateUpdate, HourlyAverage, ExchangePair } from '@crypto-dashboard/shared';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;

  beforeEach(() => {
    service = new ExchangeRateService();
  });

  describe('updateRate', () => {
    it('should store rate for a pair', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const rate: ExchangeRateUpdate = {
        pair,
        price: 3436.02,
        timestamp: new Date(),
      };

      service.updateRate(rate);

      expect(service.getRate(pair)).toEqual(rate);
    });

    it('should update existing rate for a pair', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const rate1: ExchangeRateUpdate = {
        pair,
        price: 3436.02,
        timestamp: new Date(),
      };
      const rate2: ExchangeRateUpdate = {
        pair,
        price: 3450.00,
        timestamp: new Date(Date.now() + 1000),
      };

      service.updateRate(rate1);
      service.updateRate(rate2);

      expect(service.getRate(pair)).toEqual(rate2);
    });

    it('should maintain history for a pair', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const now = new Date();
      const rate1: ExchangeRateUpdate = {
        pair,
        price: 3400,
        timestamp: new Date(now.getTime() - 120000),
      };
      const rate2: ExchangeRateUpdate = {
        pair,
        price: 3450,
        timestamp: new Date(now.getTime() - 60000),
      };
      const rate3: ExchangeRateUpdate = {
        pair,
        price: 3436,
        timestamp: now,
      };

      service.updateRate(rate1);
      service.updateRate(rate2);
      service.updateRate(rate3);

      const history = service.getHistory(pair);
      expect(history.length).toBeGreaterThanOrEqual(3);
      expect(history).toContainEqual(rate1);
      expect(history).toContainEqual(rate2);
      expect(history).toContainEqual(rate3);
    });

    it('should filter out updates older than 5 minutes', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const now = new Date();
      const oldRate: ExchangeRateUpdate = {
        pair,
        price: 3400,
        timestamp: new Date(now.getTime() - 6 * 60 * 1000), // 6 minutes ago
      };
      const recentRate: ExchangeRateUpdate = {
        pair,
        price: 3436,
        timestamp: now,
      };

      service.updateRate(oldRate);
      service.updateRate(recentRate);

      const history = service.getHistory(pair);
      expect(history).not.toContainEqual(oldRate);
      expect(history).toContainEqual(recentRate);
    });

    it('should handle multiple pairs independently', () => {
      const rate1: ExchangeRateUpdate = {
        pair: 'ETH/USDC',
        price: 3436.02,
        timestamp: new Date(),
      };
      const rate2: ExchangeRateUpdate = {
        pair: 'ETH/USDT',
        price: 3436.40,
        timestamp: new Date(),
      };

      service.updateRate(rate1);
      service.updateRate(rate2);

      expect(service.getRate('ETH/USDC')).toEqual(rate1);
      expect(service.getRate('ETH/USDT')).toEqual(rate2);
    });
  });

  describe('updateHourlyAverage', () => {
    it('should store hourly average for a pair', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const average: HourlyAverage = {
        pair,
        averagePrice: 3440.38,
        hour: new Date(),
        sampleCount: 10,
      };

      service.updateHourlyAverage(average);

      expect(service.getHourlyAverage(pair)).toEqual(average);
    });

    it('should update existing hourly average for a pair', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const average1: HourlyAverage = {
        pair,
        averagePrice: 3440.38,
        hour: new Date(),
        sampleCount: 10,
      };
      const average2: HourlyAverage = {
        pair,
        averagePrice: 3450.00,
        hour: new Date(),
        sampleCount: 15,
      };

      service.updateHourlyAverage(average1);
      service.updateHourlyAverage(average2);

      expect(service.getHourlyAverage(pair)).toEqual(average2);
    });
  });

  describe('getRate', () => {
    it('should return undefined for non-existent pair', () => {
      expect(service.getRate('ETH/USDC')).toBeUndefined();
    });

    it('should return rate for existing pair', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const rate: ExchangeRateUpdate = {
        pair,
        price: 3436.02,
        timestamp: new Date(),
      };

      service.updateRate(rate);

      expect(service.getRate(pair)).toEqual(rate);
    });
  });

  describe('getHourlyAverage', () => {
    it('should return undefined for non-existent pair', () => {
      expect(service.getHourlyAverage('ETH/USDC')).toBeUndefined();
    });

    it('should return hourly average for existing pair', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const average: HourlyAverage = {
        pair,
        averagePrice: 3440.38,
        hour: new Date(),
        sampleCount: 10,
      };

      service.updateHourlyAverage(average);

      expect(service.getHourlyAverage(pair)).toEqual(average);
    });
  });

  describe('getHistory', () => {
    it('should return empty array for pair with no history', () => {
      expect(service.getHistory('ETH/USDC')).toEqual([]);
    });

    it('should return only recent updates (within 5 minutes)', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const now = new Date();
      const recentRate: ExchangeRateUpdate = {
        pair,
        price: 3436,
        timestamp: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
      };

      service.updateRate(recentRate);

      const history = service.getHistory(pair);
      expect(history).toContainEqual(recentRate);
    });

    it('should filter out old updates', () => {
      const pair: ExchangePair = 'ETH/USDC';
      const now = new Date();
      const oldRate: ExchangeRateUpdate = {
        pair,
        price: 3400,
        timestamp: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
      };

      service.updateRate(oldRate);

      const history = service.getHistory(pair);
      expect(history).not.toContainEqual(oldRate);
    });
  });

  describe('getAllRates', () => {
    it('should return empty map when no rates exist', () => {
      const rates = service.getAllRates();
      expect(rates.size).toBe(0);
    });

    it('should return all rates', () => {
      const rate1: ExchangeRateUpdate = {
        pair: 'ETH/USDC',
        price: 3436.02,
        timestamp: new Date(),
      };
      const rate2: ExchangeRateUpdate = {
        pair: 'ETH/USDT',
        price: 3436.40,
        timestamp: new Date(),
      };

      service.updateRate(rate1);
      service.updateRate(rate2);

      const rates = service.getAllRates();
      expect(rates.size).toBe(2);
      expect(rates.get('ETH/USDC')).toEqual(rate1);
      expect(rates.get('ETH/USDT')).toEqual(rate2);
    });

    it('should return a copy of the internal map', () => {
      const rate: ExchangeRateUpdate = {
        pair: 'ETH/USDC',
        price: 3436.02,
        timestamp: new Date(),
      };

      service.updateRate(rate);

      const rates = service.getAllRates();
      rates.clear();

      expect(service.getRate('ETH/USDC')).toEqual(rate);
    });
  });

  describe('getAllHourlyAverages', () => {
    it('should return empty map when no averages exist', () => {
      const averages = service.getAllHourlyAverages();
      expect(averages.size).toBe(0);
    });

    it('should return all hourly averages', () => {
      const average1: HourlyAverage = {
        pair: 'ETH/USDC',
        averagePrice: 3440.38,
        hour: new Date(),
        sampleCount: 10,
      };
      const average2: HourlyAverage = {
        pair: 'ETH/USDT',
        averagePrice: 3439.09,
        hour: new Date(),
        sampleCount: 12,
      };

      service.updateHourlyAverage(average1);
      service.updateHourlyAverage(average2);

      const averages = service.getAllHourlyAverages();
      expect(averages.size).toBe(2);
      expect(averages.get('ETH/USDC')).toEqual(average1);
      expect(averages.get('ETH/USDT')).toEqual(average2);
    });
  });

  describe('clear', () => {
    it('should clear all rates, averages, and history', () => {
      const rate: ExchangeRateUpdate = {
        pair: 'ETH/USDC',
        price: 3436.02,
        timestamp: new Date(),
      };
      const average: HourlyAverage = {
        pair: 'ETH/USDC',
        averagePrice: 3440.38,
        hour: new Date(),
        sampleCount: 10,
      };

      service.updateRate(rate);
      service.updateHourlyAverage(average);

      service.clear();

      expect(service.getRate('ETH/USDC')).toBeUndefined();
      expect(service.getHourlyAverage('ETH/USDC')).toBeUndefined();
      expect(service.getHistory('ETH/USDC')).toEqual([]);
      expect(service.getAllRates().size).toBe(0);
      expect(service.getAllHourlyAverages().size).toBe(0);
    });
  });
});

