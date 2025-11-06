# Architecture Documentation

## Overview

This project follows **Domain-Driven Design (DDD)** and **Clean Architecture** principles to ensure maintainability, testability, and separation of concerns. The architecture is organized in layers with clear dependency rules.

## Architecture Layers

### 1. Domain Layer (Pure Business Logic)

**Location**: `packages/backend-core/src/domain/`

The domain layer is the innermost layer and contains:

- **Entities**: Core business objects with business logic
  - `ExchangeRateEntity`: Represents an exchange rate with validation
  - `HourlyAverageEntity`: Represents a calculated hourly average
  
- **Domain Services**: Business logic that doesn't belong to a single entity
  - `HourlyAverageCalculatorService`: Calculates hourly averages from exchange rates

- **Repository Interfaces**: Contracts for data persistence (no implementation)
  - `IExchangeRateRepository`: Defines methods for storing and retrieving exchange rates

- **Domain Events**: Events that represent business occurrences
  - `ExchangeRateReceivedEvent`: Fired when a new exchange rate is received
  - `HourlyAverageCalculatedEvent`: Fired when an hourly average is calculated

**Key Principles**:
- No dependencies on external frameworks or libraries
- Pure TypeScript/JavaScript code
- Business rules and invariants are enforced here
- Framework-agnostic

### 2. Application Layer (Use Cases)

**Location**: `packages/backend-core/src/application/`

The application layer orchestrates domain objects to perform use cases:

- **Use Cases**: Single-purpose operations that represent business workflows
  - `ProcessExchangeRateUseCase`: Processes incoming exchange rates
  - `CalculateHourlyAverageUseCase`: Calculates hourly averages for a given hour
  - `GetLatestHourlyAverageUseCase`: Retrieves the most recent hourly average
  - `GetPriceHistoryUseCase`: Retrieves price history for a pair

- **Application Services**: Orchestrate multiple use cases
  - `ExchangeRateOrchestratorService`: Coordinates exchange rate processing and hourly average calculation

- **Ports (Interfaces)**: Define contracts for external dependencies
  - `IExchangeRateReceiver`: Interface for receiving exchange rates from external sources
  - `IHourlyAveragePublisher`: Interface for publishing hourly average events
  - `ILogger`: Interface for logging

**Key Principles**:
- Depends only on the domain layer
- Defines interfaces (ports) for infrastructure
- Contains application-specific business logic
- Coordinates domain objects

### 3. Infrastructure Layer (External Concerns)

**Location**: `packages/backend-core/src/infrastructure/`

The infrastructure layer implements the ports defined in the application layer:

- **Adapters**: Implementations of external services
  - `FinnhubAdapter`: Connects to Finnhub WebSocket API
  - `SocketIOAdapter` (frontend): Connects to backend WebSocket

- **Repositories**: Implementations of domain repository interfaces
  - `InMemoryExchangeRateRepository`: In-memory storage for exchange rates
  - `FileSystemExchangeRateRepository`: File-based persistence for hourly averages

- **Publishers**: Implementations of event publishers
  - `RxJSHourlyAveragePublisher`: Publishes hourly averages using RxJS

- **Services**: Infrastructure services
  - `FinnhubHealthService`: Validates Finnhub API key health

- **Logging**: Logging implementations
  - `ConsoleLoggerService`: Console-based logging

**Key Principles**:
- Implements interfaces defined in the application layer
- Handles all external dependencies (databases, APIs, file system)
- Can be swapped without affecting domain/application layers
- Framework-specific code lives here

### 4. Interface Layer (User Interface)

The interface layer is split into **framework-agnostic core** and **framework-specific adapters**:

**Backend Structure**:

- **`packages/backend-core/`** (Framework-agnostic):
  - Contains all business logic (domain, application, infrastructure layers)
  - No dependencies on NestJS or any web framework
  - Can be used with Express, Fastify, or any Node.js framework

- **`apps/backend-nest/`** (NestJS-specific):
  - **Controllers**: HTTP endpoints
    - `AppController`: Health check endpoint
  
  - **Gateways**: WebSocket endpoints
    - `WebsocketGateway`: Socket.IO gateway for real-time communication

  - **Modules**: NestJS module configuration
    - `AppModule`: Main application module
    - `CoreModule`: Core services module
    - `ExchangeRateModule`: Exchange rate services module

  - **Adapters**: NestJS-specific wrappers for backend-core services
    - `FinnhubHealthService`: NestJS adapter that injects ConfigService and delegates to backend-core service
    - `ExchangeRateService`: NestJS adapter for exchange rate use cases

**Frontend Structure**:

- **`packages/frontend-core/`** (Framework-agnostic):
  - **Presenters**: Transform data for UI consumption
    - `DashboardPresenter`: Prepares dashboard view model
    - `ExchangeRateCardPresenter`: Prepares exchange rate card view model

  - **Services**: Business logic for frontend
    - `DashboardService`: Manages WebSocket connection and state
    - `ExchangeRateService`: Manages exchange rate data
    - `FormattingService`: Formats data for display

  - **Adapters**: External service adapters
    - `SocketIOAdapter`: WebSocket adapter using Socket.IO

- **`apps/frontend-react/`** (React-specific):
  - **Components**: React UI components
    - `Dashboard`: Main dashboard component
    - `ExchangeRateCard`: Individual exchange rate card with chart
    - `ConnectionStatus`: Connection status indicator
    - `ErrorScreen`: Error display component

  - **Hooks**: React hooks for state management
    - `useDashboardPresenter`: Connects React to the presenter layer

**Key Principles**:
- Framework-specific code is isolated in `apps/` directories
- Business logic is framework-agnostic in `packages/*-core/`
- Can swap frameworks without changing business logic
- Thin adapter layer that delegates to core services

## Dependency Rule

The fundamental rule of Clean Architecture is the **Dependency Rule**:

> Source code dependencies can only point inward. Nothing in an inner circle can know anything at all about something in an outer circle.

```
┌─────────────────────────────────────┐
│   Interface Layer (NestJS/React)   │
│   ───────────────────────────────   │
│   • Controllers                     │
│   • Gateways                        │
│   • Components                      │
└──────────────┬──────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────┐
│   Infrastructure Layer              │
│   ───────────────────────────────   │
│   • Adapters (Finnhub, Socket.IO)   │
│   • Repositories (File, Memory)     │
│   • Publishers (RxJS)                │
└──────────────┬──────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────┐
│   Application Layer                 │
│   ───────────────────────────────   │
│   • Use Cases                       │
│   • Application Services            │
│   • Ports (Interfaces)              │
└──────────────┬──────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────┐
│   Domain Layer                      │
│   ───────────────────────────────   │
│   • Entities                        │
│   • Domain Services                 │
│   • Repository Interfaces           │
│   • Domain Events                   │
└─────────────────────────────────────┘
```

**Key Points**:
- Domain layer has **zero dependencies** on outer layers
- Application layer depends only on domain
- Infrastructure implements interfaces from application layer
- Interface layer depends on all inner layers

## Data Flow

### Real-time Exchange Rate Flow

```
Finnhub WebSocket API
    │
    │ (raw trade data)
    ▼
FinnhubAdapter (Infrastructure)
    │
    │ (ExchangeRateEntity)
    ▼
ExchangeRateReceiver Port (Application)
    │
    │ (Observable<ExchangeRateEntity>)
    ▼
ExchangeRateOrchestratorService (Application)
    │
    ├─► ProcessExchangeRateUseCase
    │       │
    │       │ (save to repository)
    │       ▼
    │   ExchangeRateRepository (Infrastructure)
    │
    └─► CalculateHourlyAverageUseCase (periodic)
            │
            │ (calculate from repository)
            ▼
        HourlyAverageCalculatorService (Domain)
            │
            │ (HourlyAverageEntity)
            ▼
        ExchangeRateRepository.saveHourlyAverage()
            │
            │ (publish event)
            ▼
        HourlyAveragePublisher (Infrastructure)
            │
            │ (Observable<HourlyAverageEntity>)
            ▼
        WebsocketGateway (Interface)
            │
            │ (WebSocket message)
            ▼
        Frontend (Socket.IO Client)
            │
            │ (update state)
            ▼
        DashboardService (Frontend Core)
            │
            │ (view model)
            ▼
        DashboardPresenter (Frontend Core)
            │
            │ (React props)
            ▼
        React Components (Interface)
```

### Request Flow (Health Check Example)

```
HTTP Request
    │
    ▼
AppController (Interface - NestJS)
    │
    │ (delegates to adapter)
    ▼
FinnhubHealthService (Interface - NestJS Adapter)
    │
    │ (injects ConfigService, delegates to core)
    ▼
FinnhubHealthService (Infrastructure - backend-core)
    │
    │ (validates API key)
    ▼
Finnhub API (External)
    │
    │ (response)
    ▼
HTTP Response
```

## Monorepo Structure

The project uses a **Turborepo monorepo** structure with clear separation between framework-agnostic core and framework-specific adapters:

```
crypto-dashboard/
├── apps/
│   ├── backend-nest/          # NestJS adapter (Interface Layer)
│   └── frontend-react/        # React adapter (Interface Layer)
│
├── packages/
│   ├── shared/                # Shared types and constants
│   ├── backend-core/          # Backend business logic (framework-agnostic)
│   │   ├── domain/            # Domain Layer
│   │   ├── application/       # Application Layer
│   │   └── infrastructure/    # Infrastructure Layer
│   └── frontend-core/         # Frontend business logic (framework-agnostic)
│       ├── presenters/         # Presentation logic
│       ├── services/           # Business services
│       └── adapters/           # External adapters
│
└── docs/                      # Documentation
```

**Framework Independence**:

- **Backend**: 
  - `backend-core` contains all business logic and is framework-agnostic
  - `backend-nest` is just a thin NestJS adapter (controllers, gateways, modules)
  - Could create `backend-express` or `backend-fastify` using the same `backend-core`

- **Frontend**:
  - `frontend-core` contains all business logic and is framework-agnostic
  - `frontend-react` is just a thin React adapter (components, hooks)
  - Could create `frontend-vue` or `frontend-angular` using the same `frontend-core`

**Benefits**:
- Code sharing between apps
- Type safety across packages
- Independent versioning
- Clear separation of concerns
- Framework independence (can swap frameworks without changing business logic)
- Easier testing and maintenance

## Design Patterns

### 1. Repository Pattern

**Purpose**: Abstract data access logic

**Implementation**:
- Domain defines `IExchangeRateRepository` interface
- Infrastructure provides `FileSystemExchangeRateRepository` and `InMemoryExchangeRateRepository`
- Application layer uses the interface, not the implementation

**Benefits**:
- Easy to swap storage implementations
- Testable (can use in-memory for tests)
- Domain doesn't know about storage details

### 2. Adapter Pattern

**Purpose**: Adapt external services to internal interfaces

**Implementation**:
- `FinnhubAdapter` adapts Finnhub WebSocket to `IExchangeRateReceiver`
- `SocketIOAdapter` adapts Socket.IO to `IWebSocketAdapter`

**Benefits**:
- External dependencies are isolated
- Easy to mock for testing
- Can swap implementations without changing business logic

### 3. Observer Pattern (RxJS)

**Purpose**: Reactive data streams

**Implementation**:
- `FinnhubAdapter` publishes `ExchangeRateEntity` via RxJS `Subject`
- `ExchangeRateOrchestratorService` subscribes to the stream
- `HourlyAveragePublisher` publishes averages via RxJS

**Benefits**:
- Decoupled producers and consumers
- Easy to add new subscribers
- Built-in error handling and completion

### 4. Use Case Pattern

**Purpose**: Encapsulate business workflows

**Implementation**:
- Each use case is a single class with one `execute` method
- Use cases are orchestrated by application services

**Benefits**:
- Clear business intent
- Easy to test
- Reusable across different interfaces

### 5. Presenter Pattern (Frontend)

**Purpose**: Transform domain data for UI

**Implementation**:
- `DashboardPresenter` transforms service state into view models
- View models contain formatted data ready for display

**Benefits**:
- UI components stay simple
- Business logic separated from presentation
- Easy to change UI without changing business logic

## Testing Strategy

### Unit Tests
- **Domain**: Test entities, value objects, and domain services
- **Application**: Test use cases in isolation with mocked dependencies
- **Infrastructure**: Test adapters and repositories

### Integration Tests
- Test interactions between layers
- Test repository implementations with real storage
- Test adapters with external services (mocked)

### E2E Tests
- Test complete user flows
- Test WebSocket communication end-to-end
- Test UI interactions

## Related Documentation

- [Data Persistence](./data-persistence.md) - Details about storage strategies
- [Real-time Architecture](./realtime-architecture.md) - WebSocket and streaming details

