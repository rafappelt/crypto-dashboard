import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { ExchangeRateReceivedEvent } from '../../domain/events/exchange-rate-received.event.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { IHourlyAveragePublisher } from '../ports/hourly-average-publisher.port.js';

export class ProcessExchangeRateUseCase {
  constructor(
    private readonly exchangeRateRepository: IExchangeRateRepository,
    private readonly hourlyAveragePublisher: IHourlyAveragePublisher
  ) {}

  async execute(exchangeRate: ExchangeRateEntity): Promise<ExchangeRateReceivedEvent> {
    // Save the exchange rate
    await this.exchangeRateRepository.save(exchangeRate);

    // Emit domain event
    return new ExchangeRateReceivedEvent(exchangeRate);
  }
}
