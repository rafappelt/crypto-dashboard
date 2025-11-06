import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  DashboardPresenter,
  DashboardService,
  SocketIOAdapter,
  DashboardViewModel,
} from '@crypto-dashboard/frontend-core';

export function useDashboardPresenter(): DashboardViewModel {
  const [viewModel, setViewModel] = useState<DashboardViewModel>({
    connectionStatus: {
      statusText: 'Disconnected',
      isConnected: false,
      hasError: false,
    },
    exchangeRateCards: [],
  });

  const presenterRef = useRef<DashboardPresenter | null>(null);
  const serviceRef = useRef<DashboardService | null>(null);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3000';

    // Create Socket.IO adapter
    const socketFactory = () => {
      return io(wsUrl, {
        transports: ['websocket'],
      });
    };

    const adapter = new SocketIOAdapter(socketFactory);
    const service = new DashboardService(adapter);
    const presenter = new DashboardPresenter(service);

    presenterRef.current = presenter;
    serviceRef.current = service;

    // Subscribe to state changes
    presenter.onStateChange((vm: DashboardViewModel) => {
      setViewModel(vm);
    });

    // Connect
    service.connect();

    // Initial view model
    setViewModel(presenter.getViewModel());

    return () => {
      service.disconnect();
      presenterRef.current = null;
      serviceRef.current = null;
    };
  }, []);

  return viewModel;
}

