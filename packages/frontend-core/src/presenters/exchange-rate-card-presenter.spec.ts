import { ExchangeRateCardPresenter } from './exchange-rate-card-presenter.js';
import { ExchangeRateUpdate, HourlyAverage, ExchangePair } from '@crypto-dashboard/shared';

describe('ExchangeRateCardPresenter', () => {
  let presenter: ExchangeRateCardPresenter;

  beforeEach(() => {
    presenter = new ExchangeRateCardPresenter();
  });

  describe('present', () => {
    const pair: ExchangePair = 'ETH/USDC';
    const baseTimestamp = new Date('2025-01-01T10:00:00Z');

    describe('yAxisDomain calculation', () => {
      it('should calculate yAxisDomain without padding when history has multiple prices', () => {
        const history: ExchangeRateUpdate[] = [
          { pair, price: 3400, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: 3450, timestamp: new Date(baseTimestamp.getTime() - 60000) },
          { pair, price: 3436, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        expect(viewModel.yAxisDomain).not.toBeUndefined();
        
        const [min, max] = viewModel.yAxisDomain!;
        // No padding when values are different - use exact min/max
        expect(min).toBe(3400);
        expect(max).toBe(3450);
      });

      it('should calculate yAxisDomain with percentage-based padding when all prices are the same', () => {
        const samePrice = 3436.02;
        const history: ExchangeRateUpdate[] = [
          { pair, price: samePrice, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: samePrice, timestamp: new Date(baseTimestamp.getTime() - 60000) },
          { pair, price: samePrice, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        
        const [min, max] = viewModel.yAxisDomain!;
        // New logic uses 0.5% padding (0.005) for same prices
        const expectedPadding = samePrice * 0.005;
        
        expect(min).toBeCloseTo(samePrice - expectedPadding, 2);
        expect(max).toBeCloseTo(samePrice + expectedPadding, 2);
        expect(min).toBeLessThan(samePrice);
        expect(max).toBeGreaterThan(samePrice);
      });

      it('should calculate yAxisDomain using currentPrice when history is empty', () => {
        const currentPrice = 3436.02;
        const rate: ExchangeRateUpdate = {
          pair,
          price: currentPrice,
          timestamp: baseTimestamp,
        };

        const viewModel = presenter.present(pair, rate, undefined, []);

        expect(viewModel.yAxisDomain).toBeDefined();
        
        const [min, max] = viewModel.yAxisDomain!;
        // New logic uses 0.5% padding (0.005) for same prices
        const expectedPadding = currentPrice * 0.005;
        
        expect(min).toBeCloseTo(currentPrice - expectedPadding, 2);
        expect(max).toBeCloseTo(currentPrice + expectedPadding, 2);
      });

      it('should calculate yAxisDomain using both history and currentPrice', () => {
        const history: ExchangeRateUpdate[] = [
          { pair, price: 3400, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: 3450, timestamp: new Date(baseTimestamp.getTime() - 60000) },
        ];
        const rate: ExchangeRateUpdate = {
          pair,
          price: 3436,
          timestamp: baseTimestamp,
        };

        const viewModel = presenter.present(pair, rate, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        
        const [min, max] = viewModel.yAxisDomain!;
        // Should include all prices: 3400, 3450, 3436
        // No padding when values are different - use exact min/max
        expect(min).toBe(3400);
        expect(max).toBe(3450);
      });

      it('should return undefined yAxisDomain when there is no data', () => {
        const viewModel = presenter.present(pair, undefined, undefined, []);

        expect(viewModel.yAxisDomain).toBeUndefined();
      });

      it('should filter out NaN prices from history', () => {
        const history: ExchangeRateUpdate[] = [
          { pair, price: 3400, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: NaN as any, timestamp: new Date(baseTimestamp.getTime() - 60000) },
          { pair, price: 3450, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        const [min, max] = viewModel.yAxisDomain!;
        // No padding when values are different - use exact min/max
        expect(min).toBe(3400);
        expect(max).toBe(3450);
      });

      it('should handle single price point in history', () => {
        const history: ExchangeRateUpdate[] = [
          { pair, price: 3436.02, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        const [min, max] = viewModel.yAxisDomain!;
        // New logic uses 0.5% padding (0.005) for same prices
        const expectedPadding = 3436.02 * 0.005;
        
        expect(min).toBeCloseTo(3436.02 - expectedPadding, 2);
        expect(max).toBeCloseTo(3436.02 + expectedPadding, 2);
      });

      it('should ensure yAxisDomain minimum equals data minimum when values differ', () => {
        const history: ExchangeRateUpdate[] = [
          { pair, price: 3400, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: 3450, timestamp: new Date(baseTimestamp.getTime() - 60000) },
          { pair, price: 3436, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        const [min] = viewModel.yAxisDomain!;
        const dataMin = 3400;
        
        // No padding when values are different - min equals data min
        expect(min).toBe(dataMin);
      });

      it('should ensure yAxisDomain maximum equals data maximum when values differ', () => {
        const history: ExchangeRateUpdate[] = [
          { pair, price: 3400, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: 3450, timestamp: new Date(baseTimestamp.getTime() - 60000) },
          { pair, price: 3436, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        const [, max] = viewModel.yAxisDomain!;
        const dataMax = 3450;
        
        // No padding when values are different - max equals data max
        expect(max).toBe(dataMax);
      });

      it('should use percentage-based padding for very small ranges (like ETH/BTC)', () => {
        // ETH/BTC scenario: price ~0.03 with very small variation
        const smallPrice = 0.03;
        const history: ExchangeRateUpdate[] = [
          { pair, price: smallPrice, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: smallPrice, timestamp: new Date(baseTimestamp.getTime() - 60000) },
          { pair, price: smallPrice, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        const [min, max] = viewModel.yAxisDomain!;
        // For small prices (< 0.1), should use 1% minimum range
        const centerPrice = smallPrice;
        const minAbsoluteRange = centerPrice * 0.01; // 1% of price
        const percentagePadding = centerPrice * 0.005; // 0.5%
        const expectedPadding = Math.max(percentagePadding, minAbsoluteRange);
        
        expect(min).toBeCloseTo(centerPrice - expectedPadding, 6);
        expect(max).toBeCloseTo(centerPrice + expectedPadding, 6);
        expect(min).toBeLessThan(centerPrice);
        expect(max).toBeGreaterThan(centerPrice);
      });

      it('should not use padding when range is very small relative to price', () => {
        // Very small relative variation (< 0.1% of center)
        const centerPrice = 3436;
        const tinyVariation = centerPrice * 0.00005; // 0.005% variation
        const history: ExchangeRateUpdate[] = [
          { pair, price: centerPrice - tinyVariation, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: centerPrice + tinyVariation, timestamp: new Date(baseTimestamp.getTime() - 60000) },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        const [min, max] = viewModel.yAxisDomain!;
        // No padding when values are different - use exact min/max
        const actualMin = centerPrice - tinyVariation;
        const actualMax = centerPrice + tinyVariation;
        
        expect(min).toBeCloseTo(actualMin, 10);
        expect(max).toBeCloseTo(actualMax, 10);
        // Verify the center price is approximately in the middle
        const domainCenter = (min + max) / 2;
        expect(domainCenter).toBeCloseTo(centerPrice, 2);
      });

      it('should center ETH/BTC values properly when all values are 0.03', () => {
        // ETH/BTC scenario: all prices are exactly 0.03
        const price = 0.03;
        const history: ExchangeRateUpdate[] = [
          { pair, price, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price, timestamp: new Date(baseTimestamp.getTime() - 60000) },
          { pair, price, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        const [min, max] = viewModel.yAxisDomain!;
        
        // When all prices are the same, range is 0, so it uses percentage-based padding
        // For small prices (< 0.1), it uses 1% minimum range
        const minAbsoluteRange = price * 0.01; // 1% of price
        const percentagePadding = price * 0.005; // 0.5% of price
        const expectedPadding = Math.max(percentagePadding, minAbsoluteRange);
        
        expect(min).toBeCloseTo(price - expectedPadding, 6);
        expect(max).toBeCloseTo(price + expectedPadding, 6);
        
        // Most importantly: verify that 0.03 is exactly in the middle of the Y-axis
        const domainCenter = (min + max) / 2;
        expect(domainCenter).toBeCloseTo(price, 6);
        expect(domainCenter).toBe(0.03);
      });

      it('should use exact min/max for ETH/BTC values (e.g., 0.03 to 0.032)', () => {
        // ETH/BTC scenario: prices around 0.03 with small variation
        const centerPrice = 0.031;
        const minPrice = 0.03;
        const maxPrice = 0.032;
        const history: ExchangeRateUpdate[] = [
          { pair, price: minPrice, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: maxPrice, timestamp: new Date(baseTimestamp.getTime() - 60000) },
          { pair, price: centerPrice, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.yAxisDomain).toBeDefined();
        const [min, max] = viewModel.yAxisDomain!;
        
        // No padding when values are different - use exact min/max
        expect(min).toBe(minPrice);
        expect(max).toBe(maxPrice);
        
        // Verify the center price (0.031) is in the middle
        const domainCenter = (min + max) / 2;
        expect(domainCenter).toBe(centerPrice);
      });
    });

    describe('chart data formatting', () => {
      it('should format chart data correctly', () => {
        const history: ExchangeRateUpdate[] = [
          { pair, price: 3436.02, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.chartData).toHaveLength(1);
        expect(viewModel.chartData[0].time).toBe(baseTimestamp.toISOString());
        // Price should be a number, not a formatted string, to preserve precision
        expect(viewModel.chartData[0].price).toBe(3436.02);
        expect(typeof viewModel.chartData[0].price).toBe('number');
      });

      it('should preserve precision in chart data (e.g., 0.0329 should not become 0.03)', () => {
        // Critical test: ensure formatting doesn't happen before calculations
        const precisePrice = 0.0329;
        const history: ExchangeRateUpdate[] = [
          { pair, price: precisePrice, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        // Chart data should preserve the exact value as a number, not a formatted string
        expect(viewModel.chartData[0].price).toBe(precisePrice);
        expect(viewModel.chartData[0].price).not.toBe(0.03);
        expect(typeof viewModel.chartData[0].price).toBe('number');
        
        // Y-axis domain should use the precise value, not a formatted one
        expect(viewModel.yAxisDomain).toBeDefined();
        const [min, max] = viewModel.yAxisDomain!;
        // The domain should be centered around 0.0329, not 0.03
        const domainCenter = (min + max) / 2;
        expect(domainCenter).toBeCloseTo(precisePrice, 6);
        // Verify the difference is significant (0.0329 vs 0.03 = 0.0029 difference)
        expect(Math.abs(domainCenter - 0.03)).toBeGreaterThan(0.002);
      });

      it('should handle multiple history entries', () => {
        const history: ExchangeRateUpdate[] = [
          { pair, price: 3400, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: 3450, timestamp: new Date(baseTimestamp.getTime() - 60000) },
          { pair, price: 3436, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.chartData).toHaveLength(3);
      });
    });

    describe('rate and average formatting', () => {
      it('should format current price when rate is provided', () => {
        const rate: ExchangeRateUpdate = {
          pair,
          price: 3436.02,
          timestamp: baseTimestamp,
        };

        const viewModel = presenter.present(pair, rate, undefined, []);

        expect(viewModel.currentPrice).toBe('3436.02');
        expect(viewModel.hasData).toBe(true);
      });

      it('should format small prices with more decimals (e.g., ETH/BTC ~0.033)', () => {
        const rate: ExchangeRateUpdate = {
          pair: 'ETH/BTC' as ExchangePair,
          price: 0.033,
          timestamp: baseTimestamp,
        };

        const viewModel = presenter.present('ETH/BTC' as ExchangePair, rate, undefined, []);

        // For prices < 0.1, should use 6 decimals
        expect(viewModel.currentPrice).toBe('0.033000');
        expect(viewModel.hasData).toBe(true);
      });

      it('should format prices in different ranges with appropriate precision', () => {
        // Test price < 1 (should use 5 decimals)
        const rate1: ExchangeRateUpdate = {
          pair,
          price: 0.5,
          timestamp: baseTimestamp,
        };
        const viewModel1 = presenter.present(pair, rate1, undefined, []);
        expect(viewModel1.currentPrice).toBe('0.50000');

        // Test price < 10 (should use 4 decimals)
        const rate2: ExchangeRateUpdate = {
          pair,
          price: 5.123,
          timestamp: baseTimestamp,
        };
        const viewModel2 = presenter.present(pair, rate2, undefined, []);
        expect(viewModel2.currentPrice).toBe('5.1230');

        // Test price < 100 (should use 3 decimals)
        const rate3: ExchangeRateUpdate = {
          pair,
          price: 50.5,
          timestamp: baseTimestamp,
        };
        const viewModel3 = presenter.present(pair, rate3, undefined, []);
        expect(viewModel3.currentPrice).toBe('50.500');

        // Test price >= 100 (should use 2 decimals)
        const rate4: ExchangeRateUpdate = {
          pair,
          price: 3436.02,
          timestamp: baseTimestamp,
        };
        const viewModel4 = presenter.present(pair, rate4, undefined, []);
        expect(viewModel4.currentPrice).toBe('3436.02');
      });

      it('should format last update timestamp', () => {
        const rate: ExchangeRateUpdate = {
          pair,
          price: 3436.02,
          timestamp: baseTimestamp,
        };

        const viewModel = presenter.present(pair, rate, undefined, []);

        expect(viewModel.lastUpdate).toContain('2025-01-01');
        expect(viewModel.lastUpdate).toContain('UTC');
      });

      it('should use hourlyAverage from parameter when provided', () => {
        const hourlyAverage: HourlyAverage = {
          pair,
          averagePrice: 3440.38,
          hour: baseTimestamp,
          sampleCount: 10,
        };

        const viewModel = presenter.present(pair, undefined, hourlyAverage, []);

        expect(viewModel.hourlyAverage).toBe('3440.38');
      });

      it('should format hourlyAverage with adaptive precision for small values', () => {
        const hourlyAverage: HourlyAverage = {
          pair: 'ETH/BTC' as ExchangePair,
          averagePrice: 0.033,
          hour: baseTimestamp,
          sampleCount: 10,
        };

        const viewModel = presenter.present('ETH/BTC' as ExchangePair, undefined, hourlyAverage, []);

        // For prices < 0.1, should use 6 decimals
        expect(viewModel.hourlyAverage).toBe('0.033000');
      });

      it('should fallback to rate.hourlyAverage when hourlyAverage parameter is not provided', () => {
        const rate: ExchangeRateUpdate = {
          pair,
          price: 3436.02,
          timestamp: baseTimestamp,
          hourlyAverage: 3440.38,
        };

        const viewModel = presenter.present(pair, rate, undefined, []);

        expect(viewModel.hourlyAverage).toBe('3440.38');
      });

      it('should format pair display correctly', () => {
        const viewModel = presenter.present(pair, undefined, undefined, []);

        expect(viewModel.pairDisplay).toBe('ETH → USDC');
        expect(viewModel.pair).toBe(pair);
      });

      it('should set hasData to false when rate is undefined', () => {
        const viewModel = presenter.present(pair, undefined, undefined, []);

        expect(viewModel.hasData).toBe(false);
        expect(viewModel.currentPrice).toBe('');
      });

      it('should extract quote currency from pair', () => {
        const viewModel = presenter.present(pair, undefined, undefined, []);

        expect(viewModel.quoteCurrency).toBe('USDC');
      });
    });

    describe('formatYAxisValue', () => {
      it('should format Y-axis values using adaptive precision when yAxisDomain is defined', () => {
        const history: ExchangeRateUpdate[] = [
          { pair, price: 0.03001, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: 0.03002, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        expect(viewModel.formatYAxisValue).toBeDefined();
        expect(typeof viewModel.formatYAxisValue).toBe('function');
        
        // Test that the formatter uses adaptive precision
        const formatted = viewModel.formatYAxisValue(0.03001);
        // Should have enough decimals to show variation (at least 5-6 decimals for this range)
        expect(formatted.split('.')[1]?.length).toBeGreaterThanOrEqual(5);
      });

      it('should format Y-axis values with default precision when yAxisDomain is undefined', () => {
        const viewModel = presenter.present(pair, undefined, undefined, []);

        expect(viewModel.formatYAxisValue).toBeDefined();
        
        // When yAxisDomain is undefined, should use default 2 decimals
        const formatted = viewModel.formatYAxisValue(3436.02);
        expect(formatted).toBe('3436.02');
      });

      it('should format values consistently within the same domain', () => {
        const history: ExchangeRateUpdate[] = [
          { pair, price: 3400, timestamp: new Date(baseTimestamp.getTime() - 120000) },
          { pair, price: 3450, timestamp: baseTimestamp },
        ];

        const viewModel = presenter.present(pair, undefined, undefined, history);

        const formatted1 = viewModel.formatYAxisValue(3400);
        const formatted2 = viewModel.formatYAxisValue(3450);
        
        // Both should be formatted with the same precision (based on domain)
        expect(formatted1).toBeTruthy();
        expect(formatted2).toBeTruthy();
      });
    });
  });
});

