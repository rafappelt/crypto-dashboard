/**
 * Default interval (in milliseconds) for calculating hourly averages.
 * Set to 60 seconds (1 minute) to ensure timely calculation of hourly averages.
 */
export const DEFAULT_HOURLY_AVERAGE_CALCULATION_INTERVAL_MS = 60000;

/**
 * Default interval (in milliseconds) for persisting hourly averages to disk.
 * Set to 20 seconds to reduce I/O operations while maintaining data freshness.
 */
export const DEFAULT_PERSISTENCE_INTERVAL_MS = 20000;

