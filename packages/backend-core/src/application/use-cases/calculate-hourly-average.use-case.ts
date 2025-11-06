import { ExchangePair } from '@crypto-dashboard/shared';
import { HourlyAverageCalculatorService } from '../../domain/services/hourly-average-calculator.service.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { IHourlyAveragePublisher } from '../ports/hourly-average-publisher.port.js';
import { HourlyAverageCalculatedEvent } from '../../domain/events/hourly-average-calculated.event.js';

export class CalculateHourlyAverageUseCase {
  constructor(
    private readonly calculator: HourlyAverageCalculatorService,
    private readonly exchangeRateRepository: IExchangeRateRepository,
    private readonly hourlyAveragePublisher: IHourlyAveragePublisher
  ) {}

  async execute(pair: ExchangePair, hour: Date): Promise<HourlyAverageCalculatedEvent | null> {
    // Get rates for the hour
    const rates = await this.exchangeRateRepository.findByPairAndHour(pair, hour);

    // Calculate average
    const hourlyAverage = this.calculator.calculate(rates, pair, hour);

    if (!hourlyAverage) {
      return null;
    }

    // Save the average
    await this.exchangeRateRepository.saveHourlyAverage(hourlyAverage);

    // Publish the event
    this.hourlyAveragePublisher.publish(hourlyAverage);

    // Emit domain event
    return new HourlyAverageCalculatedEvent(hourlyAverage);
  }
}
