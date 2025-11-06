import { DashboardViewModel, ExchangeRateCardViewModel } from '@crypto-dashboard/frontend-core';
import ExchangeRateCard from './ExchangeRateCard';

interface DashboardProps {
  viewModel: DashboardViewModel;
}

export default function Dashboard({ viewModel }: DashboardProps) {
  const isConnecting = viewModel.connectionStatus.statusText === 'Connecting...';
  const isLoading = isConnecting || (!viewModel.connectionStatus.isConnected && !viewModel.connectionStatus.hasError);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-8">
        {viewModel.exchangeRateCards.map((card: ExchangeRateCardViewModel) => (
          <ExchangeRateCard 
            key={card.pair} 
            viewModel={card} 
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

