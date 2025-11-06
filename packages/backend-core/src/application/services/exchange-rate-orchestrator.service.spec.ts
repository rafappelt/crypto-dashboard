import { ExchangeRateOrchestratorService } from './exchange-rate-orchestrator.service.js';
import { ProcessExchangeRateUseCase } from '../use-cases/process-exchange-rate.use-case.js';
import { CalculateHourlyAverageUseCase } from '../use-cases/calculate-hourly-average.use-case.js';
import { IExchangeRateReceiver } from '../ports/exchange-rate-receiver.port.js';
import { ILogger } from '../ports/logger.port.js';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { ExchangePair } from '@crypto-dashboard/shared';
import { Subject } from 'rxjs';

describe('ExchangeRateOrchestratorService', () => {
  let orchestrator: ExchangeRateOrchestratorService;
  let mockReceiver: jest.Mocked<IExchangeRateReceiver>;
  let mockProcessUseCase: jest.Mocked<ProcessExchangeRateUseCase>;
  let mockCalculateUseCase: jest.Mocked<CalculateHourlyAverageUseCase>;
  let mockLogger: jest.Mocked<ILogger>;
  let receiverSubject: Subject<ExchangeRateEntity>;

  beforeEach(() => {
    receiverSubject = new Subject<ExchangeRateEntity>();

    mockReceiver = {
      getExchangeRates$: jest.fn().mockReturnValue(receiverSubject.asObservable()),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    mockProcessUseCase = {
      execute: jest.fn().mockResolvedValue({} as any),
    } as any;

    mockCalculateUseCase = {
      execute: jest.fn().mockResolvedValue(null),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const pairs: ExchangePair[] = ['ETH/USDC', 'ETH/USDT', 'ETH/BTC'];
    orchestrator = new ExchangeRateOrchestratorService(
      mockReceiver,
      mockProcessUseCase,
      mockCalculateUseCase,
      mockLogger,
      pairs,
      60000
    );
  });

  afterEach(async () => {
    try {
      await orchestrator.stop();
    } catch (e) {
      // Ignore errors during cleanup
    }
    receiverSubject.complete();
  });

  describe('start', () => {
    it('should connect to the receiver', async () => {
      await orchestrator.start();

      expect(mockReceiver.connect).toHaveBeenCalledTimes(1);
    });

    it('should process exchange rates from receiver', async () => {
      await orchestrator.start();

      const rate = new ExchangeRateEntity('ETH/USDC', 2000, new Date());
      receiverSubject.next(rate);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProcessUseCase.execute).toHaveBeenCalledWith(rate);
    });

    it('should calculate hourly averages immediately on start', async () => {
      await orchestrator.start();

      // Wait for immediate calculation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should calculate for all pairs
      expect(mockCalculateUseCase.execute).toHaveBeenCalledTimes(3);
    });

    it('should set up periodic calculation interval', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      await orchestrator.start();

      expect(setIntervalSpy).toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });
  });

  describe('stop', () => {
    it('should disconnect from receiver', async () => {
      await orchestrator.start();
      await orchestrator.stop();

      expect(mockReceiver.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should clear calculation interval', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      await orchestrator.start();
      await orchestrator.stop();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
