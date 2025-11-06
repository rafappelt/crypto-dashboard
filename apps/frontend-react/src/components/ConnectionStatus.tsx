import { ConnectionStatusViewModel } from '@crypto-dashboard/frontend-core';

interface ConnectionStatusProps {
  viewModel: ConnectionStatusViewModel;
}

export default function ConnectionStatus({ viewModel }: ConnectionStatusProps) {
  const getStatusStyles = () => {
    if (viewModel.hasError) {
      return {
        container: 'flex items-center gap-2 px-4 py-2 rounded text-sm text-red-500',
        indicator: 'w-2 h-2 rounded-full bg-red-500',
      };
    }
    if (viewModel.isConnected) {
      return {
        container: 'flex items-center gap-2 px-4 py-2 rounded text-sm text-green-500',
        indicator: 'w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_#10b981]',
      };
    }
    return {
      container: 'flex items-center gap-2 px-4 py-2 rounded text-sm text-gray-500',
      indicator: 'w-2 h-2 rounded-full bg-gray-500',
    };
  };

  const styles = getStatusStyles();
  const isConnecting = viewModel.statusText === 'Connecting...';

  return (
    <div className={styles.container}>
      <span className={`${styles.indicator} ${isConnecting ? 'animate-pulse' : ''}`}></span>
      <span className="font-medium">{viewModel.statusText}</span>
    </div>
  );
}

