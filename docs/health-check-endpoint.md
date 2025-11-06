# Health Check Endpoint Documentation

## Overview

The `/health` endpoint provides a comprehensive health check for the Crypto Dashboard backend application. It validates both the application status and the Finnhub API key configuration, making it essential for monitoring, orchestration, and troubleshooting.

## Implementation

### Service: `FinnhubHealthService`

**Location**: `apps/backend-nest/src/finnhub/finnhub-health.service.ts`

The service implements the following validation logic:

1. **API Key Presence Check**
   - Verifies that `FINNHUB_API_KEY` environment variable is set and non-empty
   - Returns `FINNHUB_API_KEY_MISSING` if not configured

2. **API Key Format Validation**
   - Basic format check: ensures the key is at least 10 characters long
   - Returns `FINNHUB_API_KEY_INVALID_FORMAT` if format is invalid

3. **API Key Validity Check**
   - Makes a test HTTP request to Finnhub API: `GET https://finnhub.io/api/v1/quote?symbol=AAPL&token={apiKey}`
   - Validates the response status code
   - Returns `FINNHUB_API_KEY_INVALID` if status is 401 (Unauthorized)
   - Returns `FINNHUB_API_KEY_ERROR` for other non-2xx status codes
   - Returns `FINNHUB_API_KEY_TIMEOUT` if request times out (5 seconds)

### Controller: `AppController`

**Location**: `apps/backend-nest/src/app.controller.ts`

The controller:
- Calls `FinnhubHealthService.checkApiKey()`
- Returns HTTP 200 with success payload if API key is valid
- Returns HTTP 503 (Service Unavailable) with error payload if API key is invalid or missing

## Request/Response Examples

### Successful Health Check

**Request:**
```bash
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "finnhub": {
    "status": "ok"
  }
}
```

### Missing API Key

**Response (503 Service Unavailable):**
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

### Invalid API Key (401)

**Response (503 Service Unavailable):**
```json
{
  "status": "error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "finnhub": {
    "status": "error",
    "error": {
      "code": "FINNHUB_API_KEY_INVALID",
      "message": "Finnhub API key is invalid (401 Unauthorized)"
    }
  }
}
```

## Error Codes Reference

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `FINNHUB_API_KEY_MISSING` | 503 | API key environment variable is not set | Set `FINNHUB_API_KEY` in environment or `.env` file |
| `FINNHUB_API_KEY_INVALID_FORMAT` | 503 | API key format is invalid (too short) | Verify the API key is correctly copied from Finnhub dashboard |
| `FINNHUB_API_KEY_INVALID` | 503 | API key was rejected by Finnhub (401) | Verify the API key is valid and active in Finnhub dashboard |
| `FINNHUB_API_KEY_ERROR` | 503 | Finnhub API returned an error | Check Finnhub API status and rate limits |
| `FINNHUB_API_KEY_TIMEOUT` | 503 | Validation request timed out | Check network connectivity to Finnhub API |

## Usage in Monitoring

### Docker Compose Health Check

The endpoint is automatically used by Docker Compose:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

This ensures:
- Frontend service waits for backend to be healthy
- Backend service is restarted if it becomes unhealthy
- Proper service dependency management

### Monitoring Scripts

**Basic health check:**
```bash
#!/bin/bash
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Service is healthy"
  exit 0
else
  echo "❌ Service is unhealthy"
  exit 1
fi
```

**Detailed health check with error extraction:**
```bash
#!/bin/bash
response=$(curl -s http://localhost:3000/health)
status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ "$status_code" = "200" ]; then
  echo "✅ Service is healthy"
  exit 0
else
  error_code=$(echo "$response" | jq -r '.finnhub.error.code // "UNKNOWN"')
  error_message=$(echo "$response" | jq -r '.finnhub.error.message // "Unknown error"')
  echo "❌ Service is unhealthy: $error_code - $error_message"
  exit 1
fi
```

## Performance Considerations

- **Typical Response Time**: < 1 second when API key is valid
- **Timeout**: 5 seconds maximum for Finnhub API validation request
- **Network Errors**: If a network error occurs (not timeout), the endpoint assumes the key is valid to avoid false negatives during temporary network issues
- **Rate Limiting**: The health check makes one HTTP request per call. Be mindful of Finnhub API rate limits (60 requests/minute for free tier)

## Testing

### Manual Testing

1. **Test with valid API key:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return 200 OK.

2. **Test with missing API key:**
   ```bash
   # Unset the API key
   unset FINNHUB_API_KEY
   # Restart the service
   curl http://localhost:3000/health
   ```
   Should return 503 with `FINNHUB_API_KEY_MISSING`.

3. **Test with invalid API key:**
   ```bash
   # Set an invalid key
   export FINNHUB_API_KEY=invalid_key_123
   # Restart the service
   curl http://localhost:3000/health
   ```
   Should return 503 with `FINNHUB_API_KEY_INVALID`.

### Automated Testing

The health check can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Health Check
  run: |
    timeout 30 bash -c 'until curl -f http://localhost:3000/health; do sleep 1; done'
```

## Troubleshooting

### Health Check Returns 503

1. **Check API key configuration:**
   ```bash
   echo $FINNHUB_API_KEY
   ```

2. **Verify API key in Finnhub dashboard:**
   - Visit https://finnhub.io/dashboard
   - Ensure the API key is active and not expired

3. **Check network connectivity:**
   ```bash
   curl -v https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY
   ```

4. **Review backend logs:**
   ```bash
   docker-compose logs backend
   ```

### Health Check Times Out

- Check network connectivity to `finnhub.io`
- Verify firewall rules allow outbound HTTPS connections
- Check if DNS resolution is working: `nslookup finnhub.io`

## Security Considerations

- The health check endpoint does not expose the actual API key in responses
- The endpoint is publicly accessible (no authentication required)
- Consider adding rate limiting if exposing the endpoint publicly
- The endpoint only validates the API key, it doesn't expose sensitive information

## Future Enhancements

Potential improvements:
- Add caching for validation results (avoid making request on every health check)
- Add more detailed metrics (response time, API availability)
- Add support for multiple API key validation strategies
- Add authentication/authorization for the health endpoint
- Add support for custom validation endpoints

