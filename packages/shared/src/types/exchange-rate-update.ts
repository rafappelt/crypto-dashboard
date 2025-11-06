import { ExchangeRate } from './exchange-rate.js';

export interface ExchangeRateUpdate extends ExchangeRate {
  hourlyAverage?: number;
}

