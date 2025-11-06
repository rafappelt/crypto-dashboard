import { ExchangePair } from '@crypto-dashboard/shared';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { HourlyAverageEntity } from '../../domain/entities/hourly-average.entity.js';

export class GetLatestHourlyAverageUseCase {
  constructor(
    private readonly exchangeRateRepository: IExchangeRateRepository
  ) {}

  async execute(pair: ExchangePair): Promise<HourlyAverageEntity | null> {
    return this.exchangeRateRepository.getLatestHourlyAverage(pair);
  }
}
