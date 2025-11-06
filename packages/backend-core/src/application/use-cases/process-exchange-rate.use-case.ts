import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { ExchangeRateReceivedEvent } from '../../domain/events/exchange-rate-received.event.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { ILogger } from '../ports/logger.port.js';
import { CalculateHourlyAverageUseCase } from './calculate-hourly-average.use-case.js';

export class ProcessExchangeRateUseCase {
  constructor(
    private readonly exchangeRateRepository: IExchangeRateRepository,
    private readonly calculateHourlyAverageUseCase: CalculateHourlyAverageUseCase,
    private readonly logger: ILogger
  ) {}

  async execute(exchangeRate: ExchangeRateEntity): Promise<ExchangeRateReceivedEvent> {
    // Save the exchange rate
    await this.exchangeRateRepository.save(exchangeRate);

    // Calculate hourly average immediately for the current hour
    const currentHour = new Date(
      exchangeRate.timestamp.getFullYear(),
      exchangeRate.timestamp.getMonth(),
      exchangeRate.timestamp.getDate(),
      exchangeRate.timestamp.getHours()
    );
    
    try {
      await this.calculateHourlyAverageUseCase.execute(exchangeRate.pair, currentHour);
    } catch (error) {
      // Log but don't fail the entire operation if average calculation fails
      // The periodic calculation will retry
      this.logger.error(
        `Failed to calculate hourly average for ${exchangeRate.pair}`,
        error
      );
    }

    // Emit domain event
    return new ExchangeRateReceivedEvent(exchangeRate);
  }
}
