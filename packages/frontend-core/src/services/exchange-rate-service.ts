import {
  ExchangeRateUpdate,
  ExchangePair,
  HourlyAverage,
} from '@crypto-dashboard/shared';

export interface ExchangeRateHistory {
  pair: ExchangePair;
  updates: ExchangeRateUpdate[];
}

export class ExchangeRateService {
  private rates = new Map<ExchangePair, ExchangeRateUpdate>();
  private hourlyAverages = new Map<ExchangePair, HourlyAverage>();
  private history = new Map<ExchangePair, ExchangeRateUpdate[]>();
  private readonly maxHistoryMinutes = 5;

  private filterRecentUpdates(updates: ExchangeRateUpdate[]): ExchangeRateUpdate[] {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - this.maxHistoryMinutes * 60 * 1000);
    
    return updates.filter((update) => {
      const updateTime = update.timestamp instanceof Date 
        ? update.timestamp 
        : new Date(update.timestamp);
      return updateTime >= fiveMinutesAgo;
    });
  }

  updateRate(rate: ExchangeRateUpdate): void {
    this.rates.set(rate.pair, rate);

    // Maintain history
    const pairHistory = this.history.get(rate.pair) || [];
    pairHistory.push(rate);
    
    // Keep only updates from the last 5 minutes
    const filteredHistory = this.filterRecentUpdates(pairHistory);
    
    this.history.set(rate.pair, filteredHistory);
  }

  updateHourlyAverage(average: HourlyAverage): void {
    this.hourlyAverages.set(average.pair, average);
  }

  getRate(pair: ExchangePair): ExchangeRateUpdate | undefined {
    return this.rates.get(pair);
  }

  getHourlyAverage(pair: ExchangePair): HourlyAverage | undefined {
    return this.hourlyAverages.get(pair);
  }

  getHistory(pair: ExchangePair): ExchangeRateUpdate[] {
    const history = this.history.get(pair) || [];
    // Ensure we return only updates from the last 5 minutes
    return this.filterRecentUpdates(history);
  }

  getAllRates(): Map<ExchangePair, ExchangeRateUpdate> {
    return new Map(this.rates);
  }

  getAllHourlyAverages(): Map<ExchangePair, HourlyAverage> {
    return new Map(this.hourlyAverages);
  }

  clear(): void {
    this.rates.clear();
    this.hourlyAverages.clear();
    this.history.clear();
  }
}

