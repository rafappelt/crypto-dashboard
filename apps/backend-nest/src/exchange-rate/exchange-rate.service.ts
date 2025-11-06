import { Injectable } from '@nestjs/common';
import { ExchangePair } from '@crypto-dashboard/shared';
import {
  GetLatestHourlyAverageUseCase,
  GetPriceHistoryUseCase,
  HourlyAverageEntity,
  ExchangeRateEntity,
} from '@crypto-dashboard/backend-core';

@Injectable()
export class ExchangeRateService {
  constructor(
    private readonly getLatestHourlyAverageUseCase: GetLatestHourlyAverageUseCase,
    private readonly getPriceHistoryUseCase: GetPriceHistoryUseCase,
  ) {}

  async getLatestHourlyAverage(
    pair: ExchangePair,
  ): Promise<HourlyAverageEntity | null> {
    return this.getLatestHourlyAverageUseCase.execute(pair);
  }

  async getPriceHistory(
    pair: ExchangePair,
    limit: number = 100,
  ): Promise<ExchangeRateEntity[]> {
    return this.getPriceHistoryUseCase.execute(pair, limit);
  }
}
