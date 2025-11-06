import { FinnhubHealthService, FinnhubHealthStatus } from './finnhub-health.service.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('FinnhubHealthService', () => {
  let service: FinnhubHealthService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkApiKey', () => {
    it('should return invalid status when API key is missing', async () => {
      service = new FinnhubHealthService('');

      const result = await service.checkApiKey();

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('FINNHUB_API_KEY_MISSING');
      expect(result.error?.message).toBe('Finnhub API key is not configured');
    });

    it('should return invalid status when API key is only whitespace', async () => {
      service = new FinnhubHealthService('   ');

      const result = await service.checkApiKey();

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('FINNHUB_API_KEY_MISSING');
    });

    it('should return invalid status when API key is too short', async () => {
      service = new FinnhubHealthService('short');

      const result = await service.checkApiKey();

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('FINNHUB_API_KEY_INVALID_FORMAT');
      expect(result.error?.message).toBe('Finnhub API key format is invalid');
    });

    it('should return invalid status when API key is invalid (401)', async () => {
      service = new FinnhubHealthService('valid-length-api-key-12345');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 401,
        statusText: 'Unauthorized',
        ok: false,
      });

      const result = await service.checkApiKey();

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('FINNHUB_API_KEY_INVALID');
      expect(result.error?.message).toBe(
        'Finnhub API key is invalid (401 Unauthorized)',
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('token=valid-length-api-key-12345'),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('should return invalid status when API returns other error status', async () => {
      service = new FinnhubHealthService('valid-length-api-key-12345');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 500,
        statusText: 'Internal Server Error',
        ok: false,
      });

      const result = await service.checkApiKey();

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('FINNHUB_API_KEY_ERROR');
      expect(result.error?.message).toBe(
        'Finnhub API returned error: 500 Internal Server Error',
      );
    });

    it('should return valid status when API key is valid', async () => {
      service = new FinnhubHealthService('valid-length-api-key-12345');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      const result = await service.checkApiKey();

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return timeout error when request times out', async () => {
      service = new FinnhubHealthService('valid-length-api-key-12345');
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      const checkPromise = service.checkApiKey();

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(5000);

      const result = await checkPromise;

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('FINNHUB_API_KEY_TIMEOUT');
      expect(result.error?.message).toBe('Finnhub API validation timed out');
    });

    it('should return valid status when network error occurs (non-timeout)', async () => {
      service = new FinnhubHealthService('valid-length-api-key-12345');
      const networkError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      const result = await service.checkApiKey();

      // Network errors are treated as potentially valid to avoid false negatives
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should abort request after 5 seconds', async () => {
      service = new FinnhubHealthService('valid-length-api-key-12345');
      let abortSignal: AbortSignal | undefined;

      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        abortSignal = options.signal;
        return new Promise(() => {
          // Never resolve to simulate hanging request
        });
      });

      const checkPromise = service.checkApiKey();

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(5000);

      // Wait a bit for the abort to be processed
      await Promise.resolve();

      expect(abortSignal?.aborted).toBe(true);
    });
  });
});

