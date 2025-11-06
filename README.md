# Crypto Dashboard

Real-time cryptocurrency dashboard that displays live exchange rates for ETH/USDC, ETH/USDT and ETH/BTC with live charts and data updates.

## Monorepo Structure

This is a Turborepo monorepo containing:

- **apps/**
  - `backend-nest`: NestJS backend application with WebSocket support
  - `frontend-react`: React frontend application with Vite
- **packages/**
  - `shared`: Shared TypeScript types and interfaces
  - `frontend-core`: Frontend core services, hooks and presenters
  - `backend-core`: Backend core services and domain logic

## Prerequisites

- **Docker Setup**: Docker and Docker Compose installed
- **Manual Setup**: Node.js >= 18.0.0 and pnpm >= 8.0.0
- **Finnhub API key**: Get one at [https://finnhub.io/](https://finnhub.io/) (free tier available)

## Quick Start with Docker (Recommended)

This is the fastest way to get the application running consistently across environments.

### 1. Get a Finnhub API Key

1. Sign up for a free account at [https://finnhub.io/](https://finnhub.io/)
2. Navigate to your dashboard and copy your API key
3. The free tier supports up to 60 requests/minute

### 2. Configure Environment Variables

You have **three options** to set the `FINNHUB_API_KEY`:

**Option 1: Using a `.env` file in the root (Recommended)**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Finnhub API key:

```env
FINNHUB_API_KEY=your_finnhub_api_key_here
```

**Option 2: Export as environment variable**

```bash
export FINNHUB_API_KEY=your_finnhub_api_key_here
pnpm run docker:up
```

**Option 3: Pass directly in the command**

```bash
FINNHUB_API_KEY=your_finnhub_api_key_here pnpm run docker:up
```

**Note:** The Docker Compose configuration will read from:
1. Environment variables in your shell (highest priority)
2. `.env` file in the root directory (automatically read by Docker Compose if it exists)
3. `apps/backend-nest/.env` file (if it exists)

**Important:** The `.env` file in the root is **optional**. If you don't create it, you can still use environment variables from your shell. Docker Compose automatically reads the `.env` file in the root directory for variable substitution, so you don't need to specify it in the configuration.

### 3. Run with Docker Compose

```bash
# Build and start all services
pnpm run docker:up

# Or run in detached mode (background)
pnpm run docker:up:d

# Or build and start
pnpm run docker:up:build
```

**Alternative:** You can also use `docker compose` directly:

```bash
# Build and start all services
docker compose up --build

# Or run in detached mode
docker compose up -d --build
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

### 4. Stop the Services

```bash
# Using pnpm script
pnpm run docker:down

# Or using docker compose directly
docker compose down
```

## Manual Setup (Development)

If you prefer to run the applications locally without Docker:

### 1. Install Dependencies

```bash
# Install pnpm if you don't have it
npm install -g pnpm@8.15.0

# Install all dependencies
pnpm install
```

### 2. Get a Finnhub API Key

1. Sign up at [https://finnhub.io/](https://finnhub.io/)
2. Get your free API key from the dashboard
3. Add it to the backend environment file (see below)

### 3. Configure Environment Variables

**Backend** (`apps/backend-nest/.env`):
```env
PORT=3000
FINNHUB_API_KEY=your_finnhub_api_key_here
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=INFO
DATA_DIR=./data
```

**Note:** The `DATA_DIR` environment variable specifies where hourly averages are persisted. Defaults to `./data` if not specified. The directory will be created automatically if it doesn't exist.

**Frontend** (`apps/frontend-react/.env`):
```env
VITE_WEBSOCKET_URL=http://localhost:3000
```

### 4. Run Development Servers

**Option 1: Run all apps together**
```bash
pnpm dev
```

**Option 2: Run individually**
```bash
# Backend only
pnpm --filter @crypto-dashboard/backend-nest dev

# Frontend only
pnpm --filter @crypto-dashboard/frontend-react dev
```

The applications will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

## Build

Build all packages and apps:

```bash
pnpm build
```

Or build for production with Docker:

```bash
docker-compose build
```

## Project Structure

```
crypto-dashboard/
├── apps/
│   ├── backend-nest/          # NestJS backend
│   │   ├── src/
│   │   │   ├── finnhub/        # Finnhub WebSocket service
│   │   │   ├── exchange-rate/  # Exchange rate processing
│   │   │   └── websocket/       # WebSocket gateway
│   │   ├── Dockerfile
│   │   └── package.json
│   └── frontend-react/         # React frontend
│       ├── src/
│       │   └── components/      # Dashboard components
│       ├── Dockerfile
│       ├── nginx.conf
│       └── package.json
├── packages/
│   ├── shared/                 # Shared types
│   ├── frontend-core/          # Frontend services and presenters
│   └── backend-core/           # Backend services and domain logic
├── docker-compose.yml          # Docker Compose configuration
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # pnpm workspace config
└── package.json                # Root package.json
```

## Features

- ✅ Real-time exchange rate updates via WebSocket
- ✅ Live charts for ETH/USDC, ETH/USDT, and ETH/BTC
- ✅ Hourly average calculations with file-based persistence
- ✅ Automatic reconnection on connection failures
- ✅ Connection status indicators
- ✅ Error handling and logging
- ✅ Docker support for consistent deployments
- ✅ Health check endpoint with Finnhub API key validation

## Tech Stack

- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Backend**: NestJS, TypeScript, Socket.IO
- **Frontend**: React, TypeScript, Vite, Recharts
- **Real-time**: WebSocket (Socket.IO)
- **External API**: Finnhub.io
- **Containerization**: Docker, Docker Compose

## Available Scripts

### Root Level
- `pnpm dev`: Start all apps in development mode
- `pnpm build`: Build all packages and apps
- `pnpm lint`: Run linting on all packages
- `pnpm clean`: Clean all build outputs
- `pnpm docker:up`: Start services with Docker Compose
- `pnpm docker:down`: Stop Docker Compose services
- `pnpm docker:build`: Build Docker images

### Docker Commands

**Using pnpm scripts (recommended):**
```bash
# Start services
pnpm run docker:up

# Start in detached mode with build
pnpm run docker:up:d

# Build and start
pnpm run docker:up:build

# Stop services
pnpm run docker:down

# Build images
pnpm run docker:build

# View logs
pnpm run docker:logs

# View logs for specific service
pnpm run docker:logs:backend
pnpm run docker:logs:frontend

# Development mode (with hot reload)
pnpm run docker:dev
```

**Using docker compose directly:**
```bash
# Start services
docker compose up

# Start in detached mode
docker compose up -d

# Rebuild and start
docker compose up --build

# Stop services
docker compose down

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f backend
docker compose logs -f frontend
```

## API Documentation

### Health Check Endpoint

The `/health` endpoint validates the application status and the Finnhub API key configuration.

#### Endpoint

```
GET /health
```

#### Description

This endpoint performs a comprehensive health check that includes:
- Application status verification
- Finnhub API key presence validation
- Finnhub API key validity check (makes a test request to Finnhub API)

The endpoint is used by Docker Compose health checks to ensure the backend is ready before starting dependent services.

#### Response Codes

- **200 OK**: Application is healthy and Finnhub API key is valid
- **503 Service Unavailable**: Application is running but Finnhub API key is missing or invalid

#### Success Response (200 OK)

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "finnhub": {
    "status": "ok"
  }
}
```

#### Error Response (503 Service Unavailable)

```json
{
  "status": "error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "finnhub": {
    "status": "error",
    "error": {
      "code": "FINNHUB_API_KEY_MISSING",
      "message": "Finnhub API key is not configured"
    }
  }
}
```

#### Error Codes

The endpoint can return the following error codes:

| Code | Description |
|------|-------------|
| `FINNHUB_API_KEY_MISSING` | The `FINNHUB_API_KEY` environment variable is not set or is empty |
| `FINNHUB_API_KEY_INVALID_FORMAT` | The API key format is invalid (less than 10 characters) |
| `FINNHUB_API_KEY_INVALID` | The API key was rejected by Finnhub API (401 Unauthorized) |
| `FINNHUB_API_KEY_ERROR` | The Finnhub API returned an error (non-401 status code) |
| `FINNHUB_API_KEY_TIMEOUT` | The validation request to Finnhub API timed out (5 seconds) |

#### Example Usage

**Check health status:**
```bash
curl http://localhost:3000/health
```

**Check health status with verbose output:**
```bash
curl -v http://localhost:3000/health
```

**Using in scripts:**
```bash
# Check if service is healthy
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
  echo "Service is healthy"
else
  echo "Service is unhealthy"
  exit 1
fi
```

#### Implementation Details

- **Validation Method**: The endpoint makes a test HTTP request to `https://finnhub.io/api/v1/quote?symbol=AAPL&token={apiKey}` to validate the API key
- **Timeout**: 5 seconds maximum wait time for the validation request
- **Network Errors**: If a network error occurs (not timeout), the endpoint assumes the key is valid to avoid false negatives due to temporary network issues
- **Performance**: The health check typically completes in < 1 second when the API key is valid

#### Docker Integration

The health check is automatically used by Docker Compose:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

This ensures that:
- The frontend service only starts after the backend is healthy
- The backend service is restarted if it becomes unhealthy
- Container orchestration can properly manage service dependencies

## Troubleshooting

### Docker Issues

**Port already in use:**
```bash
# Check what's using the port
lsof -i :3000
lsof -i :5173

# Stop existing containers
docker-compose down

# Or change ports in docker-compose.yml
```

**Build fails:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

**Container won't start:**
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check if environment variables are set
docker-compose config
```

### Manual Setup Issues

**pnpm not found:**
```bash
npm install -g pnpm@8.15.0
```

**Build errors:**
```bash
# Clean and reinstall
pnpm clean
rm -rf node_modules
pnpm install
pnpm build
```

**Backend won't connect to Finnhub:**
- Verify `FINNHUB_API_KEY` is set correctly
- Check if API key is valid at [Finnhub Dashboard](https://finnhub.io/dashboard)
- Free tier has rate limits (60 requests/minute)
- Use the `/health` endpoint to verify API key status: `curl http://localhost:3000/health`

**Frontend can't connect to backend:**
- Ensure backend is running on port 3000
- Check `VITE_WEBSOCKET_URL` in frontend `.env`
- Verify CORS settings in backend

**WebSocket connection issues:**
- Check browser console for errors
- Verify backend WebSocket gateway is running
- Check network tab for WebSocket connection status

## Architecture Decisions

### Real-time Architecture
- **Backend**: NestJS WebSocket Gateway using Socket.IO for bidirectional communication
- **Frontend**: Socket.IO client for real-time updates
- **Data Flow**: Finnhub WebSocket → NestJS → Socket.IO Gateway → React Frontend

### Error Handling
- Automatic reconnection with exponential backoff
- Connection status indicators in UI
- Comprehensive logging on backend
- Graceful error handling for API failures

### Code Organization
- Monorepo structure with shared packages for types and services
- Clear separation of concerns (Finnhub service, Exchange Rate service, WebSocket gateway)
- Type-safe communication using shared TypeScript types

### Data Persistence
- **Hourly Averages**: Persisted to JSON file (`data/hourly-averages.json`) using file system repository
- **Exchange Rates**: Kept in memory for real-time performance (last hour, max 3600 entries per pair)
- **Persistence Strategy**: File-based storage with atomic write operations to prevent data corruption
- **Data Directory**: Configurable via `DATA_DIR` environment variable (defaults to `./data`)
- **Docker**: Data directory is mounted as a volume to persist data across container restarts

## License

This project is part of a take-home exercise.
