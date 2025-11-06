import { ExchangePair } from './exchange-pair.js';

export interface ExchangeRate {
  pair: ExchangePair;
  price: number;
  timestamp: Date;
}

