import { Observable } from 'rxjs';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';

export interface IExchangeRateReceiver {
  getExchangeRates$(): Observable<ExchangeRateEntity>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
