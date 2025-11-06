export function formatPrice(price: number, decimals: number = 2): string {
  return price.toFixed(decimals);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

export function formatPairDisplay(pair: string): string {
  return pair.replace('/', ' → ');
}

export function formatTimeForChart(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

export function formatTimeDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString();
}

export function formatTimeForAxis(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString();
}

export function formatDateTimeForTooltip(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

/**
 * Calculates appropriate decimal precision based on price range.
 * For small ranges, uses more decimals to show meaningful variation.
 * 
 * @param minPrice Minimum price in the range
 * @param maxPrice Maximum price in the range
 * @returns Number of decimal places to use (at least 2, up to 8)
 */
export function calculateAdaptivePrecision(minPrice: number, maxPrice: number): number {
  const range = maxPrice - minPrice;
  const centerPrice = (minPrice + maxPrice) / 2;
  
  // If range is zero, use percentage-based precision
  if (range === 0) {
    // For very small prices (< 0.1), use more decimals
    if (centerPrice < 0.1) {
      return 6;
    } else if (centerPrice < 1) {
      return 5;
    } else if (centerPrice < 10) {
      return 4;
    }
    return 3;
  }
  
  // Calculate precision based on range magnitude
  // Use log10 to determine order of magnitude
  const rangeMagnitude = Math.log10(Math.abs(range));
  let decimals = Math.max(2, -Math.floor(rangeMagnitude) + 1);
  
  // For very small ranges relative to price, ensure we can see meaningful variation
  // Only apply extra precision if the range is extremely small (< 0.01%) AND the normal
  // calculation wouldn't provide enough precision
  if (centerPrice > 0) {
    const rangePercentage = range / centerPrice;
    if (rangePercentage < 0.0001) { // Less than 0.01% variation
      // Need enough decimals to show at least 2-3 significant digits in the range
      const rangeDecimals = Math.max(2, -Math.floor(rangeMagnitude) + 2);
      // Only use extra precision if it's actually needed
      if (rangeDecimals > decimals) {
        decimals = rangeDecimals;
      }
    }
  }
  
  // Cap at reasonable maximum (8 decimals)
  return Math.min(8, decimals);
}

/**
 * Formats a price with adaptive precision based on the price range.
 * 
 * @param price Price to format
 * @param minPrice Minimum price in the range
 * @param maxPrice Maximum price in the range
 * @returns Formatted price string with appropriate decimal places
 */
export function formatPriceWithAdaptivePrecision(
  price: number,
  minPrice: number,
  maxPrice: number
): string {
  const decimals = calculateAdaptivePrecision(minPrice, maxPrice);
  return formatPrice(price, decimals);
}

/**
 * Calculates appropriate decimal precision based on price value.
 * For small prices, uses more decimals to show meaningful precision.
 * 
 * @param price Price value
 * @returns Number of decimal places to use (at least 2, up to 6)
 */
export function calculatePrecisionForPrice(price: number): number {
  const absPrice = Math.abs(price);
  
  if (absPrice < 0.1) {
    return 6;
  } else if (absPrice < 1) {
    return 5;
  } else if (absPrice < 10) {
    return 4;
  } else if (absPrice < 100) {
    return 3;
  }
  return 2; // Default for prices >= 100
}

/**
 * Formats a price with adaptive precision based on the price value.
 * 
 * @param price Price to format
 * @returns Formatted price string with appropriate decimal places
 */
export function formatPriceWithAdaptivePrecisionForValue(price: number): string {
  const decimals = calculatePrecisionForPrice(price);
  return formatPrice(price, decimals);
}

