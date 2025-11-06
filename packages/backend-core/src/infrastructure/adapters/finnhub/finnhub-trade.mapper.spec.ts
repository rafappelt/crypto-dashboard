import { FinnhubTradeMapper, FinnhubTradeDto } from './finnhub-trade.mapper.js';
import { ExchangePair } from '@crypto-dashboard/shared';
import { ExchangeRateEntity } from '../../../domain/entities/exchange-rate.entity.js';

describe('FinnhubTradeMapper', () => {
  describe('toExchangeRateDto', () => {
    it('should convert Finnhub trade DTO to ExchangeRate DTO', () => {
      const trade: FinnhubTradeDto = {
        p: 3436.02,
        t: 1704110400000, // 2024-01-01T10:00:00Z
        s: 'BINANCE:ETHUSDC',
        v: 100,
      };
      const pair: ExchangePair = 'ETH/USDC';

      const result = FinnhubTradeMapper.toExchangeRateDto(trade, pair);

      expect(result.pair).toBe(pair);
      expect(result.price).toBe(3436.02);
      expect(result.timestamp).toEqual(new Date(1704110400000));
    });

    it('should handle different pairs', () => {
      const trade: FinnhubTradeDto = {
        p: 0.033,
        t: 1704110400000,
        s: 'BINANCE:ETHBTC',
        v: 50,
      };
      const pair: ExchangePair = 'ETH/BTC';

      const result = FinnhubTradeMapper.toExchangeRateDto(trade, pair);

      expect(result.pair).toBe('ETH/BTC');
      expect(result.price).toBe(0.033);
    });
  });

  describe('toExchangeRateEntity', () => {
    it('should convert Finnhub trade DTO to ExchangeRateEntity', () => {
      const trade: FinnhubTradeDto = {
        p: 3436.02,
        t: 1704110400000,
        s: 'BINANCE:ETHUSDC',
        v: 100,
      };
      const pair: ExchangePair = 'ETH/USDC';

      const result = FinnhubTradeMapper.toExchangeRateEntity(trade, pair);

      expect(result).toBeInstanceOf(ExchangeRateEntity);
      expect(result.pair).toBe(pair);
      expect(result.price).toBe(3436.02);
      expect(result.timestamp).toEqual(new Date(1704110400000));
    });
  });

  describe('getSymbolForPair', () => {
    it('should convert ETH/USDC to BINANCE:ETHUSDC', () => {
      const result = FinnhubTradeMapper.getSymbolForPair('ETH/USDC');
      expect(result).toBe('BINANCE:ETHUSDC');
    });

    it('should convert ETH/USDT to BINANCE:ETHUSDT', () => {
      const result = FinnhubTradeMapper.getSymbolForPair('ETH/USDT');
      expect(result).toBe('BINANCE:ETHUSDT');
    });

    it('should convert ETH/BTC to BINANCE:ETHBTC', () => {
      const result = FinnhubTradeMapper.getSymbolForPair('ETH/BTC');
      expect(result).toBe('BINANCE:ETHBTC');
    });
  });

  describe('getPairFromSymbol', () => {
    it('should convert BINANCE:ETHUSDC to ETH/USDC', () => {
      const result = FinnhubTradeMapper.getPairFromSymbol('BINANCE:ETHUSDC');
      expect(result).toBe('ETH/USDC');
    });

    it('should convert BINANCE:ETHUSDT to ETH/USDT', () => {
      const result = FinnhubTradeMapper.getPairFromSymbol('BINANCE:ETHUSDT');
      expect(result).toBe('ETH/USDT');
    });

    it('should convert BINANCE:ETHBTC to ETH/BTC', () => {
      const result = FinnhubTradeMapper.getPairFromSymbol('BINANCE:ETHBTC');
      expect(result).toBe('ETH/BTC');
    });

    it('should convert ETHUSDC (without prefix) to ETH/USDC', () => {
      const result = FinnhubTradeMapper.getPairFromSymbol('ETHUSDC');
      expect(result).toBe('ETH/USDC');
    });

    it('should convert ETHUSDT (without prefix) to ETH/USDT', () => {
      const result = FinnhubTradeMapper.getPairFromSymbol('ETHUSDT');
      expect(result).toBe('ETH/USDT');
    });

    it('should convert ETHBTC (without prefix) to ETH/BTC', () => {
      const result = FinnhubTradeMapper.getPairFromSymbol('ETHBTC');
      expect(result).toBe('ETH/BTC');
    });

    it('should return null for unrecognized symbol', () => {
      const result = FinnhubTradeMapper.getPairFromSymbol('UNKNOWN:SYMBOL');
      expect(result).toBeNull();
    });

    it('should return null for invalid symbol format', () => {
      const result = FinnhubTradeMapper.getPairFromSymbol('INVALID');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = FinnhubTradeMapper.getPairFromSymbol('');
      expect(result).toBeNull();
    });

    it('should return null for symbols with unrecognized prefixes', () => {
      // The mapper only recognizes BINANCE: prefix specifically
      // Other prefixes are not removed, so the symbol won't match
      const result = FinnhubTradeMapper.getPairFromSymbol('OTHER:ETHUSDC');
      // Should return null because "OTHER:ETHUSDC" doesn't end with a supported quote currency
      expect(result).toBeNull();
    });
  });

  describe('round-trip conversion', () => {
    it('should convert pair to symbol and back to pair', () => {
      const pairs: ExchangePair[] = ['ETH/USDC', 'ETH/USDT', 'ETH/BTC'];

      pairs.forEach((pair) => {
        const symbol = FinnhubTradeMapper.getSymbolForPair(pair);
        const convertedPair = FinnhubTradeMapper.getPairFromSymbol(symbol);
        expect(convertedPair).toBe(pair);
      });
    });
  });
});

