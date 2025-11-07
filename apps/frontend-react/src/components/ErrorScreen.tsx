interface ErrorScreenProps {
  errorCode: string;
  errorMessage: string;
}

export default function ErrorScreen({ errorCode, errorMessage }: ErrorScreenProps) {
  const getErrorTitle = () => {
    switch (errorCode) {
      case 'FINNHUB_API_KEY_MISSING':
        return 'Finnhub API Key Missing';
      case 'FINNHUB_API_KEY_INVALID':
        return 'Finnhub API Key Invalid';
      case 'FINNHUB_API_KEY_INVALID_FORMAT':
        return 'Invalid API Key Format';
      case 'FINNHUB_API_KEY_ERROR':
        return 'Finnhub API Error';
      case 'FINNHUB_API_KEY_TIMEOUT':
        return 'API Validation Timeout';
      case 'CONNECTION_ERROR':
        return 'Connection Error';
      default:
        return 'Configuration Error';
    }
  };

  const getErrorDescription = () => {
    switch (errorCode) {
      case 'FINNHUB_API_KEY_MISSING':
        return 'The Finnhub API key is not configured. Please set the FINNHUB_API_KEY environment variable in the backend configuration.';
      case 'FINNHUB_API_KEY_INVALID':
        return 'The Finnhub API key is invalid or has been rejected by the Finnhub API. Please verify your API key in the Finnhub dashboard and update the configuration.';
      case 'FINNHUB_API_KEY_INVALID_FORMAT':
        return 'The Finnhub API key format is invalid. Please ensure the API key is correctly copied from the Finnhub dashboard.';
      case 'FINNHUB_API_KEY_ERROR':
        return 'An error occurred while validating the Finnhub API key. Please check the backend logs for more details.';
      case 'FINNHUB_API_KEY_TIMEOUT':
        return 'The API key validation request timed out. Please check your network connection and try again.';
      case 'CONNECTION_ERROR':
        return 'Unable to connect to the API server. Please ensure the backend is running and accessible.';
      default:
        return errorMessage || 'An unexpected error occurred. Please check the backend configuration.';
    }
  };

  const getErrorIcon = () => {
    return (
      <svg
        className="w-12 h-12 md:w-16 md:h-16 text-red-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 md:p-8">
        <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 bg-red-50 rounded-full">
          {getErrorIcon()}
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-2 md:mb-3">
          {getErrorTitle()}
        </h1>
        <p className="text-sm md:text-base text-gray-600 text-center mb-4 md:mb-6 leading-relaxed">
          {getErrorDescription()}
        </p>
        <div className="bg-gray-50 rounded-lg p-3 md:p-4 mb-4 md:mb-6 border border-gray-200">
          <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">Error Code:</p>
          <code className="text-xs text-gray-700 font-mono bg-white px-2 py-1 rounded border break-all">
            {errorCode}
          </code>
        </div>
        <div className="space-y-2 md:space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 md:py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm md:text-base"
          >
            Retry
          </button>
          <a
            href="https://finnhub.io/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center text-blue-600 hover:text-blue-700 py-2 md:py-2.5 px-4 rounded-lg border border-blue-600 hover:border-blue-700 transition-colors font-medium text-sm md:text-base"
          >
            Open Finnhub Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

