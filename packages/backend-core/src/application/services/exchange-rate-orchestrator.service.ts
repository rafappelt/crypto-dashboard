import { ExchangePair, DEFAULT_EXCHANGE_PAIRS } from '@crypto-dashboard/shared';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { ProcessExchangeRateUseCase } from '../use-cases/process-exchange-rate.use-case.js';
import { CalculateHourlyAverageUseCase } from '../use-cases/calculate-hourly-average.use-case.js';
import { IExchangeRateReceiver } from '../ports/exchange-rate-receiver.port.js';
import { ILogger } from '../ports/logger.port.js';
import { DEFAULT_HOURLY_AVERAGE_CALCULATION_INTERVAL_MS } from './constants.js';

export class ExchangeRateOrchestratorService {
  private calculationInterval: NodeJS.Timeout | null = null;
  private readonly pairs: ExchangePair[];

  constructor(
    private readonly exchangeRateReceiver: IExchangeRateReceiver,
    private readonly processExchangeRateUseCase: ProcessExchangeRateUseCase,
    private readonly calculateHourlyAverageUseCase: CalculateHourlyAverageUseCase,
    private readonly logger: ILogger,
    pairs: ExchangePair[] = [...DEFAULT_EXCHANGE_PAIRS],
    private readonly calculationIntervalMs: number = DEFAULT_HOURLY_AVERAGE_CALCULATION_INTERVAL_MS
  ) {
    this.pairs = pairs;
  }

  async start(): Promise<void> {
    try {
      // Connect to exchange rate receiver
      await this.exchangeRateReceiver.connect();
    } catch (error) {
      // Log error but don't throw - allow service to continue
      // This ensures the API can start even if Finnhub connection fails
      this.logger.error('Failed to connect to exchange rate receiver', error);
      // Don't throw - return early so the service can continue
      return;
    }

    // Subscribe to exchange rate updates
    this.exchangeRateReceiver.getExchangeRates$().subscribe(async (rate) => {
      try {
        await this.processExchangeRateUseCase.execute(rate);
      } catch (error) {
        this.logger.error('Failed to process exchange rate', error);
      }
    });

    // Start periodic hourly average calculation
    this.startHourlyAverageCalculation();
  }

  async stop(): Promise<void> {
    if (this.calculationInterval) {
      clearInterval(this.calculationInterval);
      this.calculationInterval = null;
    }
    try {
      await this.exchangeRateReceiver.disconnect();
    } catch (error) {
      // Log but don't throw - allow cleanup to complete
      this.logger.error('Error disconnecting from exchange rate receiver', error);
    }
  }

  private startHourlyAverageCalculation(): void {
    // Calculate immediately on start
    this.calculateHourlyAverages();

    // Then calculate periodically
    this.calculationInterval = setInterval(() => {
      this.calculateHourlyAverages();
    }, this.calculationIntervalMs);
  }

  private async calculateHourlyAverages(): Promise<void> {
    const now = new Date();
    const currentHour = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours()
    );

    for (const pair of this.pairs) {
      try {
        await this.calculateHourlyAverageUseCase.execute(pair, currentHour);
      } catch (error) {
        this.logger.error(`Failed to calculate hourly average for ${pair}`, error);
      }
    }
  }
}
