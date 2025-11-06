import { ExchangeRateEntity } from '../entities/exchange-rate.entity.js';
import { HourlyAverageEntity } from '../entities/hourly-average.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';

export class HourlyAverageCalculatorService {
  calculate(
    rates: ExchangeRateEntity[],
    pair: ExchangePair,
    hour: Date
  ): HourlyAverageEntity | null {
    const hourlyRates = rates.filter((rate) => 
      rate.pair === pair && rate.isWithinHour(hour)
    );

    if (hourlyRates.length === 0) {
      return null;
    }

    const sum = hourlyRates.reduce((acc, rate) => acc + rate.price, 0);
    const average = sum / hourlyRates.length;

    // Normalize hour to start of the hour
    const normalizedHour = new Date(hour);
    normalizedHour.setMinutes(0, 0, 0);
    normalizedHour.setMilliseconds(0);

    return new HourlyAverageEntity(
      pair,
      average,
      normalizedHour,
      hourlyRates.length
    );
  }
}
