import { ExchangePair, DEFAULT_EXCHANGE_PAIRS } from '@crypto-dashboard/shared';
import { DashboardService, DashboardServiceState } from '../services/dashboard-service.js';
import { DashboardViewModel } from '../view-models/dashboard-view-model.js';
import { ConnectionStatusViewModel } from '../view-models/connection-status-view-model.js';
import { ExchangeRateCardPresenter } from './exchange-rate-card-presenter.js';
import { i18n } from '../i18n/i18n.service.js';

export class DashboardPresenter {
  private exchangeRateCardPresenter: ExchangeRateCardPresenter;
  private pairs: ExchangePair[] = [...DEFAULT_EXCHANGE_PAIRS];

  constructor(private dashboardService: DashboardService) {
    this.exchangeRateCardPresenter = new ExchangeRateCardPresenter();
  }

  setPairs(pairs: ExchangePair[]): void {
    this.pairs = pairs;
  }

  getViewModel(): DashboardViewModel {
    const state = this.dashboardService.getState();
    const exchangeRateService = this.dashboardService.getExchangeRateService();
    const messages = i18n.getMessages();

    const connectionStatus: ConnectionStatusViewModel = {
      statusText: this.getStatusText(state.connectionStatus, messages),
      isConnected: state.connectionStatus === 'connected',
      hasError: state.connectionStatus === 'error',
    };

    const exchangeRateCards = this.pairs.map((pair) => {
      const rate = state.rates.get(pair);
      const hourlyAverage = state.hourlyAverages.get(pair);
      const history = exchangeRateService.getHistory(pair);

      return this.exchangeRateCardPresenter.present(pair, rate, hourlyAverage, history);
    });

    return {
      connectionStatus,
      exchangeRateCards,
    };
  }

  onStateChange(callback: (viewModel: DashboardViewModel) => void): void {
    this.dashboardService.onStateChange(() => {
      callback(this.getViewModel());
    });
  }

  private getStatusText(status: DashboardService['connectionStatus'], messages: ReturnType<typeof i18n.getMessages>): string {
    switch (status) {
      case 'connected':
        return messages.connectionStatus.connected;
      case 'connecting':
        return messages.connectionStatus.connecting;
      case 'disconnected':
        return messages.connectionStatus.disconnected;
      case 'error':
        return messages.connectionStatus.error;
      default:
        return messages.connectionStatus.unknown;
    }
  }
}

