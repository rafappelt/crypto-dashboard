import { ExchangePair, ExchangeRateUpdate, HourlyAverage } from '@crypto-dashboard/shared';
import { ExchangeRateCardViewModel } from '../view-models/exchange-rate-card-view-model.js';
import {
  formatPrice,
  formatDate,
  formatPairDisplay,
  formatTimeForChart,
  formatPriceWithAdaptivePrecision,
  formatPriceWithAdaptivePrecisionForValue,
  formatTimeForAxis,
  formatDateTimeForTooltip,
} from '../services/formatting.service.js';

export class ExchangeRateCardPresenter {
  // Store previous domain per pair to stabilize domain updates
  private previousDomains: Map<ExchangePair, [number, number] | undefined> = new Map();
  private readonly DOMAIN_CHANGE_THRESHOLD = 0.05; // 5% change threshold

  present(
    pair: ExchangePair,
    rate: ExchangeRateUpdate | undefined,
    hourlyAverage: HourlyAverage | undefined,
    history: ExchangeRateUpdate[]
  ): ExchangeRateCardViewModel {
    const currentPrice = rate?.price;
    const lastUpdate = rate?.timestamp;
    const avgPrice = hourlyAverage?.averagePrice || rate?.hourlyAverage;

    // Build chart data from history - keep prices as numbers for calculations
    // Formatting should only happen at display time, not in data storage
    const chartData = history.map((update) => ({
      time: formatTimeForChart(update.timestamp),
      price: update.price, // Keep as number, not formatted string
    }));

    // Calculate Y-axis domain based on actual price data with padding
    // Always calculate domain when there's data to avoid Recharts default [0, 'auto']
    // Stabilize domain updates to avoid unnecessary changes that cause chart remounting
    const calculatedDomain = ((): [number, number] | undefined => {
      // Collect all prices from history and current rate
      const prices: number[] = [];
      
      // Add prices from history
      history.forEach((update) => {
        if (!isNaN(update.price) && isFinite(update.price)) {
          prices.push(update.price);
        }
      });
      
      // Always include current price if available (even if in history)
      if (currentPrice !== undefined && !isNaN(currentPrice) && isFinite(currentPrice)) {
        prices.push(currentPrice);
      }

      if (prices.length === 0) {
        return undefined; // No data at all, let Recharts use default
      }

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const range = maxPrice - minPrice;
      const centerPrice = (minPrice + maxPrice) / 2;

      // If all prices are the same, use percentage-based padding around center
      if (range === 0) {
        // Use 0.5% padding for small prices, but ensure minimum visual range
        const percentagePadding = centerPrice * 0.005; // 0.5%
        // For very small prices (< 0.1), ensure minimum absolute range
        const minAbsoluteRange = centerPrice < 0.1 ? centerPrice * 0.01 : 0; // 1% of price
        const padding = Math.max(percentagePadding, minAbsoluteRange);
        return [centerPrice - padding, centerPrice + padding];
      }

      // No padding when values are different - use exact min/max
      return [minPrice, maxPrice];
    })();

    // Stabilize domain: only update if change exceeds threshold
    const previousDomain = this.previousDomains.get(pair);
    const yAxisDomain = this.stabilizeDomain(calculatedDomain, previousDomain);
    
    // Update stored domain for next comparison
    if (yAxisDomain) {
      this.previousDomains.set(pair, yAxisDomain);
    } else if (calculatedDomain === undefined) {
      // Clear stored domain if no data
      this.previousDomains.delete(pair);
    }

    // Create Y-axis value formatter using adaptive precision
    const formatYAxisValue = (value: number): string => {
      if (yAxisDomain) {
        return formatPriceWithAdaptivePrecision(value, yAxisDomain[0], yAxisDomain[1]);
      }
      // Fallback to default precision when domain is undefined
      return formatPrice(value, 2);
    };

    // Create X-axis tick formatter for time display
    const formatXAxisTick = (value: string): string => {
      return formatTimeForAxis(value);
    };

    // Create tooltip label formatter for date/time display
    const formatTooltipLabel = (label: string): string => {
      return formatDateTimeForTooltip(label);
    };

    // Extract quote currency from pair (e.g., "ETH/USDC" -> "USDC")
    const quoteCurrency = pair.split('/')[1] || '';

    return {
      pair: pair,
      pairDisplay: formatPairDisplay(pair),
      quoteCurrency,
      currentPrice: currentPrice !== undefined ? formatPriceWithAdaptivePrecisionForValue(currentPrice) : '',
      lastUpdate: lastUpdate ? formatDate(lastUpdate) : '',
      hourlyAverage: avgPrice !== undefined ? formatPriceWithAdaptivePrecisionForValue(avgPrice) : '',
      chartData,
      hasData: currentPrice !== undefined,
      yAxisDomain,
      formatYAxisValue,
      formatXAxisTick,
      formatTooltipLabel,
    };
  }

  /**
   * Stabilize domain updates by only returning new domain when change exceeds threshold.
   * This prevents unnecessary domain changes that cause chart remounting.
   */
  private stabilizeDomain(
    newDomain: [number, number] | undefined,
    previousDomain: [number, number] | undefined
  ): [number, number] | undefined {
    // If no new domain, return undefined
    if (!newDomain) {
      return undefined;
    }

    // If no previous domain, use new domain
    if (!previousDomain) {
      return newDomain;
    }

    const [newMin, newMax] = newDomain;
    const [prevMin, prevMax] = previousDomain;

    // Calculate ranges
    const newRange = newMax - newMin;
    const prevRange = prevMax - prevMin;

    // Calculate how much the domain has changed
    const minChange = Math.abs(newMin - prevMin) / prevRange;
    const maxChange = Math.abs(newMax - prevMax) / prevRange;
    const rangeChange = Math.abs(newRange - prevRange) / prevRange;

    // Update domain only if change exceeds threshold
    if (
      minChange > this.DOMAIN_CHANGE_THRESHOLD ||
      maxChange > this.DOMAIN_CHANGE_THRESHOLD ||
      rangeChange > this.DOMAIN_CHANGE_THRESHOLD
    ) {
      return newDomain;
    }

    // Return previous domain to maintain stability
    return previousDomain;
  }
}

