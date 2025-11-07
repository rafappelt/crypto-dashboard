import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { ILogger } from '../ports/logger.port.js';

export class PersistHourlyAveragesUseCase {
  constructor(
    private readonly exchangeRateRepository: IExchangeRateRepository,
    private readonly logger: ILogger
  ) {}

  async execute(): Promise<void> {
    try {
      await this.exchangeRateRepository.flushHourlyAveragesToDisk();
      this.logger.debug('Successfully persisted hourly averages to disk');
    } catch (error) {
      this.logger.error('Failed to persist hourly averages to disk', error);
      throw error;
    }
  }
}

