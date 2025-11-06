import { ExchangeRateEntity } from '../entities/exchange-rate.entity.js';

export class ExchangeRateReceivedEvent {
  constructor(
    public readonly exchangeRate: ExchangeRateEntity,
    public readonly occurredAt: Date = new Date()
  ) {}
}
