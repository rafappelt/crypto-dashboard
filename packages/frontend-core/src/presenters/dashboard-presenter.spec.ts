import { DashboardPresenter } from './dashboard-presenter.js';
import { DashboardService, DashboardServiceState } from '../services/dashboard-service.js';
import { ExchangeRateService } from '../services/exchange-rate-service.js';
import { ExchangeRateUpdate, HourlyAverage, ExchangePair } from '@crypto-dashboard/shared';

describe('DashboardPresenter', () => {
  let presenter: DashboardPresenter;
  let mockDashboardService: jest.Mocked<DashboardService>;
  let mockExchangeRateService: jest.Mocked<ExchangeRateService>;

  beforeEach(() => {
    mockExchangeRateService = {
      getHistory: jest.fn(),
      getAllRates: jest.fn(),
      getAllHourlyAverages: jest.fn(),
    } as any;

    mockDashboardService = {
      getState: jest.fn(),
      getExchangeRateService: jest.fn().mockReturnValue(mockExchangeRateService),
      onStateChange: jest.fn(),
    } as any;

    presenter = new DashboardPresenter(mockDashboardService);
  });

  describe('getViewModel', () => {
    it('should return view model with connection status', () => {
      const state: DashboardServiceState = {
        connectionStatus: 'connected',
        rates: new Map(),
        hourlyAverages: new Map(),
      };

      mockDashboardService.getState.mockReturnValue(state);
      mockExchangeRateService.getHistory.mockReturnValue([]);

      const viewModel = presenter.getViewModel();

      expect(viewModel.connectionStatus.statusText).toBe('Connected');
      expect(viewModel.connectionStatus.isConnected).toBe(true);
      expect(viewModel.connectionStatus.hasError).toBe(false);
    });

    it('should map different connection statuses correctly', () => {
      const statuses: Array<{ status: DashboardService['connectionStatus']; expectedText: string }> = [
        { status: 'connected', expectedText: 'Connected' },
        { status: 'connecting', expectedText: 'Connecting...' },
        { status: 'disconnected', expectedText: 'Disconnected' },
        { status: 'error', expectedText: 'Connection Lost' },
      ];

      statuses.forEach(({ status, expectedText }) => {
        const state: DashboardServiceState = {
          connectionStatus: status,
          rates: new Map(),
          hourlyAverages: new Map(),
        };

        mockDashboardService.getState.mockReturnValue(state);
        mockExchangeRateService.getHistory.mockReturnValue([]);

        const viewModel = presenter.getViewModel();

        expect(viewModel.connectionStatus.statusText).toBe(expectedText);
        expect(viewModel.connectionStatus.isConnected).toBe(status === 'connected');
        expect(viewModel.connectionStatus.hasError).toBe(status === 'error');
      });
    });

    it('should create exchange rate cards for all pairs', () => {
      const pairs: ExchangePair[] = ['ETH/USDC', 'ETH/USDT', 'ETH/BTC'];
      presenter.setPairs(pairs);

      const state: DashboardServiceState = {
        connectionStatus: 'connected',
        rates: new Map(),
        hourlyAverages: new Map(),
      };

      mockDashboardService.getState.mockReturnValue(state);
      mockExchangeRateService.getHistory.mockReturnValue([]);

      const viewModel = presenter.getViewModel();

      expect(viewModel.exchangeRateCards).toHaveLength(3);
      expect(viewModel.exchangeRateCards[0].pair).toBe('ETH/USDC');
      expect(viewModel.exchangeRateCards[1].pair).toBe('ETH/USDT');
      expect(viewModel.exchangeRateCards[2].pair).toBe('ETH/BTC');
    });

    it('should pass rate, hourlyAverage, and history to ExchangeRateCardPresenter', () => {
      const pair: ExchangePair = 'ETH/USDC';
      presenter.setPairs([pair]);

      const rate: ExchangeRateUpdate = {
        pair,
        price: 3436.02,
        timestamp: new Date(),
      };

      const hourlyAverage: HourlyAverage = {
        pair,
        averagePrice: 3440.38,
        hour: new Date(),
        sampleCount: 10,
      };

      const history: ExchangeRateUpdate[] = [
        { pair, price: 3400, timestamp: new Date() },
        { pair, price: 3450, timestamp: new Date() },
      ];

      const state: DashboardServiceState = {
        connectionStatus: 'connected',
        rates: new Map([[pair, rate]]),
        hourlyAverages: new Map([[pair, hourlyAverage]]),
      };

      mockDashboardService.getState.mockReturnValue(state);
      mockExchangeRateService.getHistory.mockReturnValue(history);

      const viewModel = presenter.getViewModel();

      expect(viewModel.exchangeRateCards).toHaveLength(1);
      const card = viewModel.exchangeRateCards[0];
      
      expect(card.currentPrice).toBe('3436.02');
      expect(card.hourlyAverage).toBe('3440.38');
      expect(card.chartData).toHaveLength(2);
      expect(card.yAxisDomain).toBeDefined();
    });

    it('should handle missing rates and averages gracefully', () => {
      const pair: ExchangePair = 'ETH/USDC';
      presenter.setPairs([pair]);

      const state: DashboardServiceState = {
        connectionStatus: 'connected',
        rates: new Map(),
        hourlyAverages: new Map(),
      };

      mockDashboardService.getState.mockReturnValue(state);
      mockExchangeRateService.getHistory.mockReturnValue([]);

      const viewModel = presenter.getViewModel();

      expect(viewModel.exchangeRateCards).toHaveLength(1);
      const card = viewModel.exchangeRateCards[0];
      
      expect(card.hasData).toBe(false);
      expect(card.currentPrice).toBe('');
    });

    it('should use custom pairs when setPairs is called', () => {
      const customPairs: ExchangePair[] = ['ETH/USDC'];
      presenter.setPairs(customPairs);

      const state: DashboardServiceState = {
        connectionStatus: 'connected',
        rates: new Map(),
        hourlyAverages: new Map(),
      };

      mockDashboardService.getState.mockReturnValue(state);
      mockExchangeRateService.getHistory.mockReturnValue([]);

      const viewModel = presenter.getViewModel();

      expect(viewModel.exchangeRateCards).toHaveLength(1);
      expect(viewModel.exchangeRateCards[0].pair).toBe('ETH/USDC');
    });
  });

  describe('onStateChange', () => {
    it('should register callback that receives updated view model', () => {
      const callback = jest.fn();
      const state: DashboardServiceState = {
        connectionStatus: 'connected',
        rates: new Map(),
        hourlyAverages: new Map(),
      };

      mockDashboardService.getState.mockReturnValue(state);
      mockExchangeRateService.getHistory.mockReturnValue([]);

      presenter.onStateChange(callback);

      expect(mockDashboardService.onStateChange).toHaveBeenCalled();
      
      // Simulate state change
      const onStateChangeCallback = mockDashboardService.onStateChange.mock.calls[0][0];
      onStateChangeCallback(state);

      expect(callback).toHaveBeenCalled();
      const viewModel = callback.mock.calls[0][0];
      expect(viewModel.connectionStatus.statusText).toBe('Connected');
    });
  });
});

