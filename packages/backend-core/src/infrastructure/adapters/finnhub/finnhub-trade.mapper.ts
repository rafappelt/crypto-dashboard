import { ExchangeRate, ExchangePair } from '@crypto-dashboard/shared';
import { ExchangeRateEntity } from '../../../domain/entities/exchange-rate.entity.js';

export interface FinnhubTradeDto {
  p: number; // price
  t: number; // timestamp
  s: string; // symbol
  v: number; // volume
}

export class FinnhubTradeMapper {
  private static readonly EXCHANGE_PREFIX = 'BINANCE:';
  private static readonly SUPPORTED_QUOTE_CURRENCIES = ['USDC', 'USDT', 'BTC'] as const;

  static toExchangeRateDto(trade: FinnhubTradeDto, pair: ExchangePair): ExchangeRate {
    return {
      pair,
      price: trade.p,
      timestamp: new Date(trade.t),
    };
  }

  static toExchangeRateEntity(trade: FinnhubTradeDto, pair: ExchangePair): ExchangeRateEntity {
    const dto = this.toExchangeRateDto(trade, pair);
    return new ExchangeRateEntity(dto.pair, dto.price, dto.timestamp);
  }

  /**
   * Converts an exchange pair to Finnhub symbol format.
   * Returns symbol in EXCHANGE:SYMBOL format as required by Finnhub WebSocket API.
   * Example: 'ETH/USDC' -> 'BINANCE:ETHUSDC'
   */
  static getSymbolForPair(pair: ExchangePair): string {
    const symbolWithoutSlash = pair.replace('/', '');
    return `${this.EXCHANGE_PREFIX}${symbolWithoutSlash}`;
  }

  /**
   * Converts a Finnhub symbol to exchange pair.
   * Accepts both formats: with exchange prefix (BINANCE:ETHUSDT) and without (ETHUSDT)
   * for robustness when handling incoming trade messages.
   * Returns null if the symbol format is not recognized.
   * Example: 'BINANCE:ETHUSDC' or 'ETHUSDC' -> 'ETH/USDC'
   */
  static getPairFromSymbol(symbol: string): ExchangePair | null {
    // Remove exchange prefix if present
    const symbolWithoutPrefix = symbol.startsWith(this.EXCHANGE_PREFIX)
      ? symbol.slice(this.EXCHANGE_PREFIX.length)
      : symbol;

    // Find matching quote currency and insert slash
    for (const quote of this.SUPPORTED_QUOTE_CURRENCIES) {
      if (symbolWithoutPrefix.endsWith(quote)) {
        const base = symbolWithoutPrefix.slice(0, -quote.length);
        const pair = `${base}/${quote}` as ExchangePair;
        
        // Validate that the resulting pair is a valid ExchangePair
        if (this.isValidExchangePair(pair)) {
          return pair;
        }
      }
    }

    return null;
  }

  private static isValidExchangePair(pair: string): pair is ExchangePair {
    return pair === 'ETH/USDC' || pair === 'ETH/USDT' || pair === 'ETH/BTC';
  }
}
