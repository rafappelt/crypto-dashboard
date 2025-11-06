import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_EXCHANGE_PAIRS } from '@crypto-dashboard/shared';
import {
  ExchangeRateOrchestratorService,
  FileSystemExchangeRateRepository,
  RxJsHourlyAveragePublisher,
  FinnhubAdapter,
  HourlyAverageCalculatorService,
  ProcessExchangeRateUseCase,
  CalculateHourlyAverageUseCase,
  GetLatestHourlyAverageUseCase,
  GetPriceHistoryUseCase,
  IExchangeRateRepository,
  IHourlyAveragePublisher,
  IExchangeRateReceiver,
  createDefaultLogger,
  DEFAULT_MAX_RECONNECT_ATTEMPTS,
  DEFAULT_HOURLY_AVERAGE_CALCULATION_INTERVAL_MS,
} from '@crypto-dashboard/backend-core';

export const EXCHANGE_RATE_REPOSITORY = 'IExchangeRateRepository';
export const HOURLY_AVERAGE_PUBLISHER = 'IHourlyAveragePublisher';
export const EXCHANGE_RATE_RECEIVER = 'IExchangeRateReceiver';

@Module({
  providers: [
    // Infrastructure
    {
      provide: EXCHANGE_RATE_REPOSITORY,
      useFactory: (configService: ConfigService) => {
        const dataDir = configService.get<string>('DATA_DIR') || './data';
        const logger = createDefaultLogger();
        return new FileSystemExchangeRateRepository(
          dataDir,
          [...DEFAULT_EXCHANGE_PAIRS],
          logger
        );
      },
      inject: [ConfigService],
    },
    {
      provide: HOURLY_AVERAGE_PUBLISHER,
      useClass: RxJsHourlyAveragePublisher,
    },
    {
      provide: EXCHANGE_RATE_RECEIVER,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('FINNHUB_API_KEY') || '';
        return new FinnhubAdapter({
          apiKey,
          pairs: [...DEFAULT_EXCHANGE_PAIRS],
          maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
          logger: createDefaultLogger(),
        });
      },
      inject: [ConfigService],
    },
    // Domain Services
    HourlyAverageCalculatorService,
    // Use Cases
    {
      provide: ProcessExchangeRateUseCase,
      useFactory: (
        repository: IExchangeRateRepository,
        publisher: IHourlyAveragePublisher,
      ) => {
        return new ProcessExchangeRateUseCase(repository, publisher);
      },
      inject: [EXCHANGE_RATE_REPOSITORY, HOURLY_AVERAGE_PUBLISHER],
    },
    {
      provide: CalculateHourlyAverageUseCase,
      useFactory: (
        calculator: HourlyAverageCalculatorService,
        repository: IExchangeRateRepository,
        publisher: IHourlyAveragePublisher,
      ) => {
        return new CalculateHourlyAverageUseCase(
          calculator,
          repository,
          publisher,
        );
      },
      inject: [
        HourlyAverageCalculatorService,
        EXCHANGE_RATE_REPOSITORY,
        HOURLY_AVERAGE_PUBLISHER,
      ],
    },
    {
      provide: GetLatestHourlyAverageUseCase,
      useFactory: (repository: IExchangeRateRepository) => {
        return new GetLatestHourlyAverageUseCase(repository);
      },
      inject: [EXCHANGE_RATE_REPOSITORY],
    },
    {
      provide: GetPriceHistoryUseCase,
      useFactory: (repository: IExchangeRateRepository) => {
        return new GetPriceHistoryUseCase(repository);
      },
      inject: [EXCHANGE_RATE_REPOSITORY],
    },
    // Orchestrator
    {
      provide: ExchangeRateOrchestratorService,
      useFactory: (
        receiver: IExchangeRateReceiver,
        processUseCase: ProcessExchangeRateUseCase,
        calculateUseCase: CalculateHourlyAverageUseCase,
      ) => {
        return new ExchangeRateOrchestratorService(
          receiver,
          processUseCase,
          calculateUseCase,
          createDefaultLogger(),
          [...DEFAULT_EXCHANGE_PAIRS],
          DEFAULT_HOURLY_AVERAGE_CALCULATION_INTERVAL_MS,
        );
      },
      inject: [
        EXCHANGE_RATE_RECEIVER,
        ProcessExchangeRateUseCase,
        CalculateHourlyAverageUseCase,
      ],
    },
  ],
  exports: [
    EXCHANGE_RATE_REPOSITORY,
    HOURLY_AVERAGE_PUBLISHER,
    EXCHANGE_RATE_RECEIVER,
    HourlyAverageCalculatorService,
    ProcessExchangeRateUseCase,
    CalculateHourlyAverageUseCase,
    GetLatestHourlyAverageUseCase,
    GetPriceHistoryUseCase,
    ExchangeRateOrchestratorService,
  ],
})
export class CoreModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly orchestrator: ExchangeRateOrchestratorService) {}

  async onModuleInit() {
    // Start orchestrator asynchronously without blocking module initialization
    // This ensures the API starts even if Finnhub connection fails
    await this.orchestrator.start().catch((error) => {
      console.error('Error starting exchange rate orchestrator:', error);
      // Don't throw - allow the API to start so health check can report the error
    });
  }

  async onModuleDestroy() {
    try {
      await this.orchestrator.stop();
    } catch (error) {
      console.error('Error stopping exchange rate orchestrator:', error);
      // Don't throw - allow module destruction to complete
    }
  }
}
