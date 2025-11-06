# Data Persistence Strategy

## Overview

The application uses a **hybrid persistence strategy** combining in-memory storage for real-time data and file-based storage for historical averages.

## Storage Strategy

### 1. Exchange Rates (In-Memory)

**Storage**: In-memory `Map<ExchangePair, ExchangeRateEntity[]>`

**Location**: `FileSystemExchangeRateRepository.priceHistory`

**Characteristics**:
- **Purpose**: Real-time price updates for charting
- **Retention**: Last hour of data (max 3600 entries per pair)
- **Performance**: O(1) access, O(n) for filtering by time range
- **Persistence**: **Not persisted** - data is lost on restart

**Why In-Memory?**:
- Real-time performance requirements
- Data is ephemeral (only needed for current hour)
- Reduces I/O overhead
- Simplifies implementation

**Limitations**:
- Data lost on application restart
- Limited to available memory
- Not suitable for historical analysis
- Single-instance only (no distributed support)

### 2. Hourly Averages (File-Based)

**Storage**: JSON file (`data/hourly-averages.json`)

**Location**: `FileSystemExchangeRateRepository`

**Characteristics**:
- **Purpose**: Historical hourly averages for display
- **Retention**: **Permanent** (until manually deleted)
- **Format**: JSON with atomic writes
- **Structure**: `{ hourlyAverages: { [key]: HourlyAverageData } }`

**File Structure**:
```json
{
  "hourlyAverages": {
    "ETH/USDC-2024-01-15T10:00:00.000Z": {
      "pair": "ETH/USDC",
      "averagePrice": 2345.67,
      "hour": "2024-01-15T10:00:00.000Z",
      "sampleCount": 120
    }
  }
}
```

**Key Format**: `{pair}-{hour ISO string}`

**Atomic Writes**:
The repository uses atomic write operations to prevent data corruption:

```typescript
// Write to temporary file first
const tempFilePath = `${this.storageFilePath}.tmp`;
await fs.writeFile(tempFilePath, JSON.stringify(data, null, 2), 'utf-8');
// Then rename (atomic operation on most file systems)
await fs.rename(tempFilePath, this.storageFilePath);
```

## File-Based Storage: Limitations and Considerations

### Limitations

#### 1. **Single Instance Only**
- **Problem**: File-based storage doesn't work in distributed/multi-instance deployments
- **Impact**: Cannot run multiple backend instances sharing the same data
- **Workaround**: Use a single instance or implement distributed storage

#### 2. **No Concurrent Write Protection**
- **Problem**: Multiple processes writing to the same file can cause corruption
- **Impact**: Race conditions possible if multiple instances access the same file
- **Mitigation**: Atomic writes help, but don't prevent all race conditions
- **Current State**: Single-instance deployment mitigates this risk

#### 3. **Performance at Scale**
- **Problem**: Reading/writing entire file becomes slow with many averages
- **Impact**: O(n) complexity for file operations
- **Current State**: Acceptable for small to medium datasets
- **Future Consideration**: May need database for large-scale deployments

#### 4. **No Query Capabilities**
- **Problem**: Cannot efficiently query by date range, filter, or aggregate
- **Impact**: Must load all data and filter in memory
- **Workaround**: Current implementation loads all averages and filters in memory

#### 5. **No Transactions**
- **Problem**: Cannot rollback failed operations
- **Impact**: Partial writes possible (mitigated by atomic writes)
- **Current State**: Acceptable for this use case

#### 6. **Backup and Recovery**
- **Problem**: Manual backup required
- **Impact**: Data loss if file is corrupted or deleted
- **Recommendation**: Implement automated backups for production

#### 7. **Docker Volume Considerations**
- **Problem**: File permissions and volume mounting can be complex
- **Impact**: May require specific volume configurations
- **Current State**: Handled in `docker-compose.yml` with volume mounts

### When File-Based Storage is Appropriate

✅ **Good for**:
- Single-instance deployments
- Development and testing
- Small to medium datasets (< 10,000 records)
- Simple persistence requirements
- Zero-dependency deployments

❌ **Not suitable for**:
- Multi-instance/distributed deployments
- High-throughput write scenarios
- Complex queries and aggregations
- Large datasets (> 100,000 records)
- Production systems requiring ACID guarantees

## Configuration

### Environment Variables

**`DATA_DIR`** (default: `./data`)
- Specifies the directory for data files
- Created automatically if it doesn't exist
- Must be writable by the application

**Example**:
```env
DATA_DIR=/var/lib/crypto-dashboard/data
```

### Docker Configuration

In `docker-compose.yml`, the data directory is mounted as a volume:

```yaml
volumes:
  - ./data:/app/data
```

This ensures:
- Data persists across container restarts
- Data is accessible from host for backup
- Data survives container recreation

## Data Lifecycle

### Exchange Rates

1. **Receive**: Exchange rate arrives from Finnhub
2. **Store**: Added to in-memory history (max 3600 entries)
3. **Process**: Used for hourly average calculation
4. **Expire**: Old entries removed when limit exceeded
5. **Lost**: All data lost on application restart

### Hourly Averages

1. **Calculate**: Computed from exchange rates at end of hour
2. **Store**: Saved to JSON file with atomic write
3. **Retrieve**: Loaded from file when requested
4. **Persist**: Data survives application restarts
5. **Retention**: Permanent (manual cleanup required)

## Migration Path to Database

If file-based storage becomes insufficient, consider migrating to:

### Option 1: SQLite
- **Pros**: Zero-config, file-based, SQL queries, ACID transactions
- **Cons**: Still single-instance, limited concurrency
- **Use Case**: Single-instance production, better query capabilities

### Option 2: PostgreSQL/MySQL
- **Pros**: Full ACID, multi-instance, complex queries, proven scalability
- **Cons**: Requires separate service, more complex setup
- **Use Case**: Multi-instance production, high availability

### Option 3: Redis
- **Pros**: Fast, in-memory, pub/sub, distributed
- **Cons**: Volatile (unless persistence enabled), different data model
- **Use Case**: High-performance, real-time requirements

### Migration Strategy

1. **Implement Repository Interface**: Create new repository implementing `IExchangeRateRepository`
2. **Feature Flag**: Use environment variable to choose storage backend
3. **Data Migration**: Script to migrate existing file data to database
4. **Gradual Rollout**: Deploy with both implementations, switch via config
5. **Remove Old Implementation**: After validation, remove file-based storage

## Backup Strategy

### Current State
- **Manual**: No automated backups
- **Location**: `data/hourly-averages.json`
- **Frequency**: As needed

### Recommended for Production

1. **Automated Backups**:
   - Daily backups of `data/hourly-averages.json`
   - Retain last 7 days
   - Store in separate location (S3, etc.)

2. **Backup Script Example**:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/backups/crypto-dashboard"
   DATA_FILE="./data/hourly-averages.json"
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   
   cp "$DATA_FILE" "$BACKUP_DIR/hourly-averages-$TIMESTAMP.json"
   ```

3. **Recovery Procedure**:
   - Stop application
   - Restore backup file
   - Restart application

## Performance Considerations

### File Size Growth

**Estimate**: ~200 bytes per hourly average entry

**Growth Rate**:
- 3 pairs × 24 hours/day × 365 days = ~26,280 entries/year
- ~5.2 MB/year per pair
- ~15.6 MB/year total

**Acceptable**: File size remains manageable for years

### Read Performance

- **Current**: O(n) - must read entire file
- **Acceptable**: For < 10,000 entries, < 100ms
- **Bottleneck**: Large files (> 1 MB) may take > 1s

### Write Performance

- **Current**: O(n) - must rewrite entire file
- **Frequency**: Once per hour per pair (3 writes/hour)
- **Acceptable**: < 50ms per write
- **Bottleneck**: Large files may cause write delays

## Monitoring Recommendations

1. **File Size**: Monitor `hourly-averages.json` size
2. **Write Latency**: Track time to save averages
3. **Disk Space**: Ensure sufficient space for data directory
4. **Error Rate**: Monitor failed writes/reads
5. **Backup Status**: Verify backups are running

## Related Documentation

- [Architecture Documentation](./architecture.md) - Overall architecture

