import { ExchangePair } from '../types/exchange-pair.js';

/**
 * Default exchange pairs supported by the application.
 * This configuration should be the single source of truth for exchange pairs.
 */
export const DEFAULT_EXCHANGE_PAIRS: readonly ExchangePair[] = [
  'ETH/USDC',
  'ETH/USDT',
  'ETH/BTC',
] as const;

