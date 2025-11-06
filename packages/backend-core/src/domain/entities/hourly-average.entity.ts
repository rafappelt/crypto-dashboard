import { ExchangePair } from '@crypto-dashboard/shared';

export class HourlyAverageEntity {
  constructor(
    public readonly pair: ExchangePair,
    public readonly averagePrice: number,
    public readonly hour: Date,
    public readonly sampleCount: number
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.averagePrice <= 0) {
      throw new Error('Hourly average price must be positive');
    }
    if (this.sampleCount <= 0) {
      throw new Error('Sample count must be positive');
    }
    // Ensure hour is at the start of the hour
    const normalizedHour = new Date(this.hour);
    normalizedHour.setMinutes(0, 0, 0);
    normalizedHour.setMilliseconds(0);
    if (normalizedHour.getTime() !== this.hour.getTime()) {
      throw new Error('Hour must be at the start of the hour');
    }
  }

  getKey(): string {
    return `${this.pair}-${this.hour.toISOString()}`;
  }
}
