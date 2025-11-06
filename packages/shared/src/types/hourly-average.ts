import { ExchangePair } from './exchange-pair.js';

export interface HourlyAverage {
  pair: ExchangePair;
  averagePrice: number;
  hour: Date;
  sampleCount: number;
}

