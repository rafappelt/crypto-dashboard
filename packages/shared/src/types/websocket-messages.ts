import { ExchangeRate } from './exchange-rate.js';
import { HourlyAverage } from './hourly-average.js';
import { ConnectionStatus } from './connection-status.js';
import { ErrorPayload } from './error-payload.js';

export interface WebSocketMessage {
  type: 'exchange-rate' | 'hourly-average' | 'error' | 'connection-status';
  data?: ExchangeRate | HourlyAverage | ConnectionStatus | ErrorPayload;
}


