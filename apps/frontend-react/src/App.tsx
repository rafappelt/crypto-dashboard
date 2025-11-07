import { useState, useEffect } from 'react';
import { useDashboardPresenter } from './hooks/use-dashboard-presenter';
import Dashboard from './components/Dashboard';
import ConnectionStatus from './components/ConnectionStatus';
import ErrorScreen from './components/ErrorScreen';
import { HealthCheckService, HealthCheckResponse } from './services/health-check.service';

function App() {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const viewModel = useDashboardPresenter();

  useEffect(() => {
    const checkHealth = async () => {
      const healthService = new HealthCheckService();
      const result = await healthService.checkHealth();
      setHealthStatus(result);
      setIsChecking(false);
    };

    checkHealth();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking API health...</p>
        </div>
      </div>
    );
  }

  if (
    healthStatus?.status === 'error' ||
    healthStatus?.finnhub?.status === 'error'
  ) {
    const error = healthStatus.finnhub?.error;
    if (error) {
      return (
        <ErrorScreen
          errorCode={error.code}
          errorMessage={error.message}
        />
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white px-4 py-4 md:px-8 md:py-6 shadow-sm flex justify-between items-center gap-2">
        <h1 className="text-lg md:text-2xl font-semibold text-gray-900 truncate">Crypto Dashboard</h1>
        <ConnectionStatus viewModel={viewModel.connectionStatus} />
      </header>
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        <Dashboard viewModel={viewModel} />
      </main>
    </div>
  );
}

export default App;

