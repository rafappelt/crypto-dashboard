import { ExchangePair } from '@crypto-dashboard/shared';

export class ExchangeRateEntity {
  constructor(
    public readonly pair: ExchangePair,
    public readonly price: number,
    public readonly timestamp: Date
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.price <= 0) {
      throw new Error('Exchange rate price must be positive');
    }
    if (this.timestamp > new Date()) {
      throw new Error('Exchange rate timestamp cannot be in the future');
    }
  }

  isWithinHour(hour: Date): boolean {
    const hourStart = new Date(hour);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

    return (
      this.timestamp.getTime() >= hourStart.getTime() &&
      this.timestamp.getTime() < hourEnd.getTime()
    );
  }
}
