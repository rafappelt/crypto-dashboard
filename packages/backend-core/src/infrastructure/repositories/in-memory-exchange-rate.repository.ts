import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { HourlyAverageEntity } from '../../domain/entities/hourly-average.entity.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { ExchangePair, DEFAULT_EXCHANGE_PAIRS } from '@crypto-dashboard/shared';
import { MAX_EXCHANGE_RATE_HISTORY_ENTRIES } from './constants.js';

export class InMemoryExchangeRateRepository implements IExchangeRateRepository {
  private priceHistory: Map<ExchangePair, ExchangeRateEntity[]> = new Map();
  private hourlyAverages: Map<string, HourlyAverageEntity> = new Map();

  constructor(pairs: ExchangePair[] = [...DEFAULT_EXCHANGE_PAIRS]) {
    pairs.forEach((pair) => {
      this.priceHistory.set(pair, []);
    });
  }

  async save(rate: ExchangeRateEntity): Promise<void> {
    const history = this.priceHistory.get(rate.pair) || [];
    history.push(rate);
    
    // Keep only last hour of data (assuming ~1 update per second)
    if (history.length > MAX_EXCHANGE_RATE_HISTORY_ENTRIES) {
      history.shift();
    }
    
    this.priceHistory.set(rate.pair, history);
  }

  async findByPair(pair: ExchangePair, limit: number = 100): Promise<ExchangeRateEntity[]> {
    const history = this.priceHistory.get(pair) || [];
    return history.slice(-limit);
  }

  async findByPairAndHour(pair: ExchangePair, hour: Date): Promise<ExchangeRateEntity[]> {
    const history = this.priceHistory.get(pair) || [];
    const hourStart = new Date(hour);
    hourStart.setMinutes(0, 0, 0);
    hourStart.setMilliseconds(0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

    return history.filter((rate) => {
      const timestamp = rate.timestamp.getTime();
      return timestamp >= hourStart.getTime() && timestamp < hourEnd.getTime();
    });
  }

  async getLatestHourlyAverage(pair: ExchangePair): Promise<HourlyAverageEntity | null> {
    const keyPrefix = `${pair}-`;
    let latest: HourlyAverageEntity | null = null;
    let latestTime = 0;

    this.hourlyAverages.forEach((avg, key) => {
      if (key.startsWith(keyPrefix)) {
        const time = avg.hour.getTime();
        if (time > latestTime) {
          latestTime = time;
          latest = avg;
        }
      }
    });

    return latest;
  }

  async saveHourlyAverage(average: HourlyAverageEntity): Promise<void> {
    const key = average.getKey();
    this.hourlyAverages.set(key, average);
  }

  async getAllHourlyAverages(pair: ExchangePair): Promise<HourlyAverageEntity[]> {
    const keyPrefix = `${pair}-`;
    const averages: HourlyAverageEntity[] = [];

    this.hourlyAverages.forEach((avg, key) => {
      if (key.startsWith(keyPrefix)) {
        averages.push(avg);
      }
    });

    return averages.sort((a, b) => b.hour.getTime() - a.hour.getTime());
  }

  async flushHourlyAveragesToDisk(): Promise<void> {
    // No-op for in-memory repository (nothing to flush)
  }
}
