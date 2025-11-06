import { ExchangeRateEntity } from '../entities/exchange-rate.entity.js';
import { HourlyAverageEntity } from '../entities/hourly-average.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';

export interface IExchangeRateRepository {
  save(rate: ExchangeRateEntity): Promise<void>;
  findByPair(pair: ExchangePair, limit?: number): Promise<ExchangeRateEntity[]>;
  findByPairAndHour(pair: ExchangePair, hour: Date): Promise<ExchangeRateEntity[]>;
  getLatestHourlyAverage(pair: ExchangePair): Promise<HourlyAverageEntity | null>;
  saveHourlyAverage(average: HourlyAverageEntity): Promise<void>;
  getAllHourlyAverages(pair: ExchangePair): Promise<HourlyAverageEntity[]>;
}
