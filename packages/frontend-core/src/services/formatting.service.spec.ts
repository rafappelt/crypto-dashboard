import {
  formatPrice,
  formatDate,
  formatPairDisplay,
  formatTimeForChart,
  formatTimeDisplay,
  calculateAdaptivePrecision,
  formatPriceWithAdaptivePrecision,
  calculatePrecisionForPrice,
  formatPriceWithAdaptivePrecisionForValue,
} from './formatting.service.js';

describe('formatting service', () => {
  describe('formatPrice', () => {
    it('should format price with 2 decimals by default', () => {
      expect(formatPrice(3436.02)).toBe('3436.02');
      expect(formatPrice(3436.0)).toBe('3436.00');
      expect(formatPrice(3436.123456)).toBe('3436.12');
    });

    it('should format price with custom decimals', () => {
      expect(formatPrice(3436.02, 0)).toBe('3436');
      expect(formatPrice(3436.02, 4)).toBe('3436.0200');
      expect(formatPrice(3436.123456, 3)).toBe('3436.123');
    });

    it('should handle zero', () => {
      expect(formatPrice(0)).toBe('0.00');
      expect(formatPrice(0, 0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatPrice(-100.5)).toBe('-100.50');
    });

    it('should round correctly', () => {
      expect(formatPrice(3436.999)).toBe('3437.00');
      expect(formatPrice(3436.995, 2)).toBe('3436.99');
    });
  });

  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2025-01-01T10:30:45.123Z');
      const formatted = formatDate(date);

      expect(formatted).toContain('2025-01-01');
      expect(formatted).toContain('10:30:45');
      expect(formatted).toContain('UTC');
    });

    it('should format date string correctly', () => {
      const dateString = '2025-01-01T10:30:45.123Z';
      const formatted = formatDate(dateString);

      expect(formatted).toContain('2025-01-01');
      expect(formatted).toContain('10:30:45');
      expect(formatted).toContain('UTC');
    });

    it('should format date in UTC format', () => {
      const date = new Date('2025-01-01T10:30:45Z');
      const formatted = formatDate(date);

      expect(formatted).toBe('2025-01-01 10:30:45 UTC');
    });

    it('should handle different date formats', () => {
      const date = new Date('2025-12-25T23:59:59Z');
      const formatted = formatDate(date);

      expect(formatted).toContain('2025-12-25');
      expect(formatted).toContain('23:59:59');
    });
  });

  describe('formatPairDisplay', () => {
    it('should replace slash with arrow', () => {
      expect(formatPairDisplay('ETH/USDC')).toBe('ETH → USDC');
      expect(formatPairDisplay('ETH/USDT')).toBe('ETH → USDT');
      expect(formatPairDisplay('ETH/BTC')).toBe('ETH → BTC');
    });

    it('should handle pairs without slash', () => {
      expect(formatPairDisplay('ETHUSDC')).toBe('ETHUSDC');
    });

    it('should handle multiple slashes', () => {
      expect(formatPairDisplay('A/B/C')).toBe('A → B/C');
    });
  });

  describe('formatTimeForChart', () => {
    it('should format Date object as ISO string', () => {
      const date = new Date('2025-01-01T10:30:45.123Z');
      const formatted = formatTimeForChart(date);

      expect(formatted).toBe(date.toISOString());
    });

    it('should format date string as ISO string', () => {
      const dateString = '2025-01-01T10:30:45.123Z';
      const date = new Date(dateString);
      const formatted = formatTimeForChart(dateString);

      expect(formatted).toBe(date.toISOString());
    });

    it('should return ISO 8601 format', () => {
      const date = new Date('2025-01-01T10:30:45Z');
      const formatted = formatTimeForChart(date);

      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('formatTimeDisplay', () => {
    it('should format Date object using toLocaleTimeString', () => {
      const date = new Date('2025-01-01T10:30:45Z');
      const formatted = formatTimeDisplay(date);

      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should format date string using toLocaleTimeString', () => {
      const dateString = '2025-01-01T10:30:45Z';
      const date = new Date(dateString);
      const formatted = formatTimeDisplay(dateString);

      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should handle different time zones', () => {
      const date = new Date('2025-01-01T10:30:45Z');
      const formatted = formatTimeDisplay(date);

      // Should format according to system locale
      expect(formatted).toBe(date.toLocaleTimeString());
    });
  });

  describe('calculateAdaptivePrecision', () => {
    it('should return 6 decimals for very small prices (< 0.1) with zero range', () => {
      expect(calculateAdaptivePrecision(0.03, 0.03)).toBe(6);
      expect(calculateAdaptivePrecision(0.05, 0.05)).toBe(6);
    });

    it('should return 5 decimals for small prices (< 1) with zero range', () => {
      expect(calculateAdaptivePrecision(0.5, 0.5)).toBe(5);
      expect(calculateAdaptivePrecision(0.9, 0.9)).toBe(5);
    });

    it('should return 4 decimals for medium prices (< 10) with zero range', () => {
      expect(calculateAdaptivePrecision(5.0, 5.0)).toBe(4);
      expect(calculateAdaptivePrecision(9.5, 9.5)).toBe(4);
    });

    it('should return 3 decimals for larger prices with zero range', () => {
      expect(calculateAdaptivePrecision(100, 100)).toBe(3);
      expect(calculateAdaptivePrecision(3436, 3436)).toBe(3);
    });

    it('should calculate precision based on range magnitude', () => {
      // Large range (50 units) - should use 2 decimals
      expect(calculateAdaptivePrecision(3400, 3450)).toBe(2);
      
      // Medium range (0.5 units) - should use 2 decimals (0.5 needs 1 decimal, 2 is sufficient)
      expect(calculateAdaptivePrecision(3400, 3400.5)).toBe(2);
      
      // Small range (0.01 units) - should use 3 decimals (0.01 needs 2 decimals, 3 allows for padding)
      expect(calculateAdaptivePrecision(3400, 3400.01)).toBeGreaterThanOrEqual(3);
      
      // Very small range (0.001 units) - should use 4 decimals
      expect(calculateAdaptivePrecision(3400, 3400.001)).toBeGreaterThanOrEqual(4);
    });

    it('should handle very small ranges for small prices', () => {
      // ETH/BTC scenario: price ~0.03 with tiny variation
      const min = 0.03001;
      const max = 0.03002;
      const precision = calculateAdaptivePrecision(min, max);
      expect(precision).toBeGreaterThanOrEqual(5);
    });

    it('should cap precision at 8 decimals', () => {
      // Extremely small range should not exceed 8 decimals
      const precision = calculateAdaptivePrecision(0.00000001, 0.00000002);
      expect(precision).toBeLessThanOrEqual(8);
    });

    it('should return at least 2 decimals', () => {
      // Very large range should still use at least 2 decimals
      const precision = calculateAdaptivePrecision(1000, 10000);
      expect(precision).toBeGreaterThanOrEqual(2);
    });

    it('should handle very small relative ranges', () => {
      // Range < 0.01% of center price should use extra precision
      const center = 3436;
      const tinyRange = center * 0.00003; // 0.003% of center (well below 0.01% threshold)
      const range = 2 * tinyRange; // Actual range from min to max
      const precision = calculateAdaptivePrecision(center - tinyRange, center + tinyRange);
      // With such a tiny range, we need more decimals to see variation
      // rangePercentage = 0.00006 < 0.0001, so it should use extra precision
      expect(precision).toBeGreaterThan(2);
    });
  });

  describe('formatPriceWithAdaptivePrecision', () => {
    it('should format price with adaptive precision for zero range', () => {
      const formatted = formatPriceWithAdaptivePrecision(0.03, 0.03, 0.03);
      expect(formatted).toMatch(/0\.03\d{4}/); // Should have 6 decimals for 0.03
    });

    it('should format price with adaptive precision for small range', () => {
      const formatted = formatPriceWithAdaptivePrecision(0.03001, 0.03001, 0.03002);
      expect(formatted.split('.')[1]?.length || 0).toBeGreaterThanOrEqual(5);
    });

    it('should format price with adaptive precision for large range', () => {
      const formatted = formatPriceWithAdaptivePrecision(3425, 3400, 3450);
      expect(formatted).toMatch(/3425\.\d{2}/); // Should have 2 decimals for large range
    });

    it('should use appropriate precision for ETH/BTC scenario', () => {
      const price = 0.030015;
      const formatted = formatPriceWithAdaptivePrecision(price, 0.03001, 0.03002);
      // Should show enough decimals to see the variation
      expect(formatted.split('.')[1]?.length || 0).toBeGreaterThanOrEqual(5);
    });
  });

  describe('calculatePrecisionForPrice', () => {
    it('should return 6 decimals for prices < 0.1', () => {
      expect(calculatePrecisionForPrice(0.03)).toBe(6);
      expect(calculatePrecisionForPrice(0.09)).toBe(6);
      expect(calculatePrecisionForPrice(0.001)).toBe(6);
    });

    it('should return 5 decimals for prices < 1', () => {
      expect(calculatePrecisionForPrice(0.5)).toBe(5);
      expect(calculatePrecisionForPrice(0.9)).toBe(5);
      expect(calculatePrecisionForPrice(0.1)).toBe(5);
    });

    it('should return 4 decimals for prices < 10', () => {
      expect(calculatePrecisionForPrice(5.0)).toBe(4);
      expect(calculatePrecisionForPrice(9.9)).toBe(4);
      expect(calculatePrecisionForPrice(1)).toBe(4);
    });

    it('should return 3 decimals for prices < 100', () => {
      expect(calculatePrecisionForPrice(50)).toBe(3);
      expect(calculatePrecisionForPrice(99.9)).toBe(3);
      expect(calculatePrecisionForPrice(10)).toBe(3);
    });

    it('should return 2 decimals for prices >= 100', () => {
      expect(calculatePrecisionForPrice(100)).toBe(2);
      expect(calculatePrecisionForPrice(3436.02)).toBe(2);
      expect(calculatePrecisionForPrice(10000)).toBe(2);
    });

    it('should handle negative prices', () => {
      expect(calculatePrecisionForPrice(-0.03)).toBe(6);
      expect(calculatePrecisionForPrice(-50)).toBe(3);
      expect(calculatePrecisionForPrice(-100)).toBe(2);
    });
  });

  describe('formatPriceWithAdaptivePrecisionForValue', () => {
    it('should format small prices with 6 decimals', () => {
      expect(formatPriceWithAdaptivePrecisionForValue(0.033)).toBe('0.033000');
      expect(formatPriceWithAdaptivePrecisionForValue(0.05)).toBe('0.050000');
    });

    it('should format prices < 1 with 5 decimals', () => {
      expect(formatPriceWithAdaptivePrecisionForValue(0.5)).toBe('0.50000');
      expect(formatPriceWithAdaptivePrecisionForValue(0.9)).toBe('0.90000');
    });

    it('should format prices < 10 with 4 decimals', () => {
      expect(formatPriceWithAdaptivePrecisionForValue(5.123)).toBe('5.1230');
      expect(formatPriceWithAdaptivePrecisionForValue(9.9)).toBe('9.9000');
    });

    it('should format prices < 100 with 3 decimals', () => {
      expect(formatPriceWithAdaptivePrecisionForValue(50.5)).toBe('50.500');
      expect(formatPriceWithAdaptivePrecisionForValue(99.9)).toBe('99.900');
    });

    it('should format prices >= 100 with 2 decimals', () => {
      expect(formatPriceWithAdaptivePrecisionForValue(3436.02)).toBe('3436.02');
      expect(formatPriceWithAdaptivePrecisionForValue(100)).toBe('100.00');
    });
  });
});

