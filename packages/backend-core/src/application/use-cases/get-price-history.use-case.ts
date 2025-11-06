import { ExchangePair } from '@crypto-dashboard/shared';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';

export class GetPriceHistoryUseCase {
  constructor(
    private readonly exchangeRateRepository: IExchangeRateRepository
  ) {}

  async execute(pair: ExchangePair, limit: number = 100): Promise<ExchangeRateEntity[]> {
    return this.exchangeRateRepository.findByPair(pair, limit);
  }
}
