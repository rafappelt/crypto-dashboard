export interface FinnhubHealthStatus {
  isValid: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export class FinnhubHealthService {
  constructor(private readonly apiKey: string) {}

  async checkApiKey(): Promise<FinnhubHealthStatus> {
    // Check if API key is missing
    if (!this.apiKey || this.apiKey.trim() === '') {
      return {
        isValid: false,
        error: {
          code: 'FINNHUB_API_KEY_MISSING',
          message: 'Finnhub API key is not configured',
        },
      };
    }

    // Validate API key format (basic check: should be a non-empty string)
    if (this.apiKey.trim().length < 10) {
      return {
        isValid: false,
        error: {
          code: 'FINNHUB_API_KEY_INVALID_FORMAT',
          message: 'Finnhub API key format is invalid',
        },
      };
    }

    // Validate API key by making a test request
    try {
      const testUrl = `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${this.apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(testUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        return {
          isValid: false,
          error: {
            code: 'FINNHUB_API_KEY_INVALID',
            message: 'Finnhub API key is invalid (401 Unauthorized)',
          },
        };
      }

      if (!response.ok) {
        return {
          isValid: false,
          error: {
            code: 'FINNHUB_API_KEY_ERROR',
            message: `Finnhub API returned error: ${response.status} ${response.statusText}`,
          },
        };
      }

      // Key is valid
      return {
        isValid: true,
      };
    } catch (error) {
      // Network or timeout errors - we'll consider the key as potentially valid
      // to avoid false negatives due to network issues
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          isValid: false,
          error: {
            code: 'FINNHUB_API_KEY_TIMEOUT',
            message: 'Finnhub API validation timed out',
          },
        };
      }
      return {
        isValid: true,
      };
    }
  }
}

