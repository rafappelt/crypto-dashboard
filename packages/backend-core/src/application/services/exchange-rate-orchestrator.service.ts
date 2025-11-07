import { ExchangePair, DEFAULT_EXCHANGE_PAIRS } from '@crypto-dashboard/shared';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { ProcessExchangeRateUseCase } from '../use-cases/process-exchange-rate.use-case.js';
import { CalculateHourlyAverageUseCase } from '../use-cases/calculate-hourly-average.use-case.js';
import { PersistHourlyAveragesUseCase } from '../use-cases/persist-hourly-averages.use-case.js';
import { IExchangeRateReceiver } from '../ports/exchange-rate-receiver.port.js';
import { ILogger } from '../ports/logger.port.js';
import { DEFAULT_HOURLY_AVERAGE_CALCULATION_INTERVAL_MS, DEFAULT_PERSISTENCE_INTERVAL_MS } from './constants.js';

export class ExchangeRateOrchestratorService {
  private calculationInterval: NodeJS.Timeout | null = null;
  private persistenceInterval: NodeJS.Timeout | null = null;
  private readonly pairs: ExchangePair[];

  constructor(
    private readonly exchangeRateReceiver: IExchangeRateReceiver,
    private readonly processExchangeRateUseCase: ProcessExchangeRateUseCase,
    private readonly calculateHourlyAverageUseCase: CalculateHourlyAverageUseCase,
    private readonly persistHourlyAveragesUseCase: PersistHourlyAveragesUseCase,
    private readonly logger: ILogger,
    pairs: ExchangePair[] = [...DEFAULT_EXCHANGE_PAIRS],
    private readonly calculationIntervalMs: number = DEFAULT_HOURLY_AVERAGE_CALCULATION_INTERVAL_MS,
    private readonly persistenceIntervalMs: number = DEFAULT_PERSISTENCE_INTERVAL_MS
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
    
    // Start periodic persistence
    this.startPersistence();
  }

  async stop(): Promise<void> {
    if (this.calculationInterval) {
      clearInterval(this.calculationInterval);
      this.calculationInterval = null;
    }
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
      this.persistenceInterval = null;
    }
    
    // Flush any remaining data before stopping
    try {
      await this.persistHourlyAveragesUseCase.execute();
    } catch (error) {
      this.logger.error('Error flushing hourly averages on shutdown', error);
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

  private startPersistence(): void {
    // Persist immediately on start
    this.persistHourlyAverages();

    // Then persist periodically
    this.persistenceInterval = setInterval(() => {
      this.persistHourlyAverages();
    }, this.persistenceIntervalMs);
  }

  private async persistHourlyAverages(): Promise<void> {
    try {
      await this.persistHourlyAveragesUseCase.execute();
    } catch (error) {
      this.logger.error('Failed to persist hourly averages', error);
    }
  }
}
