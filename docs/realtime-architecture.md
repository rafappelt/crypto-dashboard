# Real-time Architecture

## Overview

The application uses a **multi-layer real-time architecture** to stream exchange rate data from Finnhub to the frontend with minimal latency.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Finnhub WebSocket API                     │
│                  (External Data Source)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ WebSocket (wss://ws.finnhub.io)
                        │ Raw trade data (JSON)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Infrastructure Layer (Backend)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         FinnhubAdapter                                │  │
│  │  • Connects to Finnhub WebSocket                     │  │
│  │  • Subscribes to ETH/USDC, ETH/USDT, ETH/BTC         │  │
│  │  • Maps Finnhub trades to ExchangeRateEntity         │  │
│  │  • Publishes via RxJS Subject                        │  │
│  └───────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ Observable<ExchangeRateEntity>
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Layer (Backend)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    ExchangeRateOrchestratorService                    │  │
│  │  • Subscribes to exchange rate stream                 │  │
│  │  • Processes each rate (saves to repository)         │  │
│  │  • Calculates hourly averages periodically           │  │
│  └───────────────────────┬──────────────────────────────┘  │
│                          │                                  │
│  ┌───────────────────────┴──────────────────────────────┐  │
│  │  ProcessExchangeRateUseCase                          │  │
│  │  CalculateHourlyAverageUseCase                        │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HourlyAverageEntity
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Infrastructure Layer (Backend)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    RxJSHourlyAveragePublisher                         │  │
│  │  • Publishes hourly averages via RxJS Subject        │  │
│  └───────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ Observable<HourlyAverageEntity>
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Interface Layer (Backend)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         WebsocketGateway (NestJS)                     │  │
│  │  • Socket.IO server                                   │  │
│  │  • Subscribes to exchange rates and averages         │  │
│  │  • Broadcasts to connected clients                    │  │
│  └───────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ Socket.IO WebSocket
                           │ (message events)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Interface Layer (Frontend)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         SocketIOAdapter                                │  │
│  │  • Socket.IO client                                    │  │
│  │  • Handles connection/disconnection                   │  │
│  │  • Emits subscribe messages                           │  │
│  └───────────────────────┬──────────────────────────────┘  │
│                          │                                  │
│  ┌───────────────────────┴──────────────────────────────┐  │
│  │         DashboardService                                │  │
│  │  • Manages WebSocket connection state                   │  │
│  │  • Processes incoming messages                         │  │
│  │  • Updates exchange rate service                       │  │
│  └───────────────────────┬──────────────────────────────┘  │
│                          │                                  │
│  ┌───────────────────────┴──────────────────────────────┐  │
│  │         DashboardPresenter                             │  │
│  │  • Transforms service state to view models             │  │
│  │  • Formats data for display                            │  │
│  └───────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ ViewModel
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              React Components                                │
│  • Dashboard                                                │
│  • ExchangeRateCard (with Recharts)                          │
│  • ConnectionStatus                                          │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Details

### 1. Exchange Rate Reception

**Step 1**: Finnhub sends trade data
```json
{
  "type": "trade",
  "data": [
    {
      "s": "BINANCE:ETHUSDC",
      "p": 2345.67,
      "t": 1705320000000,
      "v": 0.5
    }
  ]
}
```

**Step 2**: `FinnhubAdapter` receives and maps
- Maps symbol to exchange pair (`BINANCE:ETHUSDC` → `ETH/USDC`)
- Creates `ExchangeRateEntity` with validation
- Publishes via RxJS `Subject`

**Step 3**: `ExchangeRateOrchestratorService` subscribes
- Receives `ExchangeRateEntity`
- Calls `ProcessExchangeRateUseCase`

**Step 4**: Use case saves to repository
- Adds to in-memory history
- Maintains last hour of data (max 3600 entries)

### 2. Hourly Average Calculation

**Step 1**: Periodic trigger (every minute)
- `ExchangeRateOrchestratorService` runs calculation
- For each exchange pair
- For current hour

**Step 2**: `CalculateHourlyAverageUseCase`
- Retrieves all rates for the hour from repository
- Calls `HourlyAverageCalculatorService` (domain service)
- Calculates average price and sample count

**Step 3**: Save and publish
- Saves `HourlyAverageEntity` to repository (file-based)
- Publishes via `RxJSHourlyAveragePublisher`

**Step 4**: `WebsocketGateway` receives and broadcasts
- Subscribes to hourly average stream
- Broadcasts to all connected clients via Socket.IO

### 3. Frontend Update

**Step 1**: Socket.IO client receives message
```json
{
  "type": "exchange-rate",
  "data": {
    "pair": "ETH/USDC",
    "price": 2345.67,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "hourlyAverage": 2340.50
  }
}
```

**Step 2**: `DashboardService` processes message
- Updates `ExchangeRateService` state
- Notifies state change callbacks

**Step 3**: `DashboardPresenter` transforms
- Creates view model with formatted data
- Prepares chart data points
- Formats timestamps and prices

**Step 4**: React components re-render
- `ExchangeRateCard` updates chart
- Displays new price and timestamp
- Updates hourly average display

## Connection Management

### Backend Reconnection (Finnhub)

**Strategy**: Exponential backoff with max attempts

```typescript
private handleReconnect(): void {
  if (this.reconnectAttempts >= this.maxReconnectAttempts) {
    this.logger.error('Max reconnection attempts reached');
    return;
  }

  this.reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
  
  setTimeout(() => {
    this.connect();
  }, delay);
}
```

**Characteristics**:
- Initial delay: 1s
- Max delay: 30s
- Max attempts: 10 (configurable)
- Resets on successful connection

### Frontend Reconnection (Socket.IO)

**Strategy**: Socket.IO built-in reconnection

**Configuration**:
```typescript
const socket = io(wsUrl, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});
```

**Enhancements**:
- Visual connection status indicators
- Error handling for permanent failures
- Graceful degradation

## Message Types

### Exchange Rate Update

```typescript
{
  type: 'exchange-rate',
  data: {
    pair: 'ETH/USDC',
    price: 2345.67,
    timestamp: '2024-01-15T10:30:00.000Z',
    hourlyAverage?: 2340.50
  }
}
```

### Hourly Average Update

```typescript
{
  type: 'hourly-average',
  data: {
    pair: 'ETH/USDC',
    averagePrice: 2340.50,
    hour: '2024-01-15T10:00:00.000Z',
    sampleCount: 120
  }
}
```

### Connection Status

```typescript
{
  type: 'connection-status',
  data: {
    status: 'connected' | 'disconnected' | 'error',
    message?: string
  }
}
```

## Performance Considerations

### Backend

- **Memory**: In-memory storage limited to last hour (~3600 entries/pair)
- **CPU**: Average calculation runs once per minute (low overhead)
- **Network**: WebSocket is efficient (no HTTP overhead per message)

### Frontend

- **Chart Updates**: Recharts handles efficient updates
- **State Management**: Minimal re-renders (only affected components)
- **Memory**: Chart data limited to visible time range

## Error Handling

### Backend Errors

1. **Finnhub Connection Failure**
   - Logs error
   - Attempts reconnection with backoff
   - Service continues running (doesn't crash)

2. **Message Parsing Error**
   - Logs error
   - Skips malformed message
   - Continues processing other messages

3. **Repository Save Error**
   - Logs error
   - Retries with exponential backoff
   - Falls back gracefully

### Frontend Errors

1. **WebSocket Connection Failure**
   - Shows connection status indicator
   - Attempts automatic reconnection
   - Displays error message if permanent failure

2. **Invalid Message Data**
   - Logs error to console
   - Skips invalid messages
   - Continues processing other messages

3. **Chart Rendering Error**
   - Falls back to text display
   - Shows error message
   - Maintains other functionality

## Scalability Considerations

### Current Limitations

- Single backend instance (file-based storage)
- In-memory exchange rate history (lost on restart)
- No horizontal scaling support

### Future Improvements

- Database for persistence (enables multi-instance)
- Redis for shared state
- Message queue for decoupling
- Load balancing for multiple instances

## Related Documentation

- [Architecture Documentation](./architecture.md)

