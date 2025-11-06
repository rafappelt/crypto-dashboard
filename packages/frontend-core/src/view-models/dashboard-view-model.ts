import { ConnectionStatusViewModel } from './connection-status-view-model.js';
import { ExchangeRateCardViewModel } from './exchange-rate-card-view-model.js';

export interface DashboardViewModel {
  connectionStatus: ConnectionStatusViewModel;
  exchangeRateCards: ExchangeRateCardViewModel[];
}

