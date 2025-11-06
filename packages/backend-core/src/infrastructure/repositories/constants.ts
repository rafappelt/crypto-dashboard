/**
 * Maximum number of exchange rate entries to keep in memory per pair.
 * Assuming ~1 update per second, this keeps approximately 1 hour of data.
 */
export const MAX_EXCHANGE_RATE_HISTORY_ENTRIES = 3600;

