import { promises as fs } from 'fs';
import { join } from 'path';
import { ExchangeRateEntity } from '../../domain/entities/exchange-rate.entity.js';
import { HourlyAverageEntity } from '../../domain/entities/hourly-average.entity.js';
import { IExchangeRateRepository } from '../../domain/repositories/exchange-rate.repository.js';
import { ExchangePair, DEFAULT_EXCHANGE_PAIRS } from '@crypto-dashboard/shared';
import { MAX_EXCHANGE_RATE_HISTORY_ENTRIES } from './constants.js';
import { ILogger } from '../../application/ports/logger.port.js';
import { createDefaultLogger } from '../logging/index.js';
import { Mutex } from 'async-mutex';

interface HourlyAverageData {
  pair: ExchangePair;
  averagePrice: number;
  hour: string; // ISO string
  sampleCount: number;
}

interface StorageData {
  hourlyAverages: Record<string, HourlyAverageData>;
}

export class FileSystemExchangeRateRepository implements IExchangeRateRepository {
  private priceHistory: Map<ExchangePair, ExchangeRateEntity[]> = new Map();
  private readonly storageFilePath: string;
  private readonly logger: ILogger;
  private readonly dataDir: string;
  private readonly fileMutex: Mutex = new Mutex();

  constructor(
    dataDir: string = './data',
    pairs: ExchangePair[] = [...DEFAULT_EXCHANGE_PAIRS],
    logger?: ILogger
  ) {
    this.dataDir = dataDir;
    this.storageFilePath = join(dataDir, 'hourly-averages.json');
    this.logger = logger || createDefaultLogger();

    // Initialize price history for each pair
    pairs.forEach((pair) => {
      this.priceHistory.set(pair, []);
    });

    // Ensure data directory exists
    this.ensureDataDirectory().catch((error) => {
      this.logger.error('Failed to create data directory', error);
    });
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create data directory: ${this.dataDir}`, error);
      throw error;
    }
  }

  private async loadStorageData(): Promise<StorageData> {
    try {
      const data = await fs.readFile(this.storageFilePath, 'utf-8');
      return JSON.parse(data) as StorageData;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist yet, return empty data
        return { hourlyAverages: {} };
      }
      this.logger.error('Failed to load storage data', error);
      throw error;
    }
  }

  private async saveStorageData(data: StorageData): Promise<void> {
    try {
      await this.ensureDataDirectory();
      // Write to temporary file first, then rename (atomic operation)
      const tempFilePath = `${this.storageFilePath}.tmp`;
      const jsonContent = JSON.stringify(data, null, 2);
      await fs.writeFile(tempFilePath, jsonContent, 'utf-8');
      await fs.rename(tempFilePath, this.storageFilePath);
    } catch (error) {
      this.logger.error('Failed to save storage data', error);
      throw error;
    }
  }

  /**
   * Executes a read-modify-write operation atomically using a mutex lock.
   * This prevents concurrent writes from corrupting the file.
   */
  private async atomicFileOperation<T>(
    operation: (data: StorageData) => Promise<{ data: StorageData; result: T }>
  ): Promise<T> {
    const release = await this.fileMutex.acquire();
    try {
      const storageData = await this.loadStorageData();
      const { data: modifiedData, result } = await operation(storageData);
      await this.saveStorageData(modifiedData);
      return result;
    } finally {
      release();
    }
  }

  private hourlyAverageToData(entity: HourlyAverageEntity): HourlyAverageData {
    return {
      pair: entity.pair,
      averagePrice: entity.averagePrice,
      hour: entity.hour.toISOString(),
      sampleCount: entity.sampleCount,
    };
  }

  private dataToHourlyAverage(data: HourlyAverageData): HourlyAverageEntity {
    return new HourlyAverageEntity(
      data.pair,
      data.averagePrice,
      new Date(data.hour),
      data.sampleCount
    );
  }

  async save(rate: ExchangeRateEntity): Promise<void> {
    const history = this.priceHistory.get(rate.pair) || [];
    history.push(rate);

    // Keep only last hour of data (assuming ~1 update per second)
    if (history.length > MAX_EXCHANGE_RATE_HISTORY_ENTRIES) {
      history.shift();
    }

    this.priceHistory.set(rate.pair, history);
  }

  async findByPair(pair: ExchangePair, limit: number = 100): Promise<ExchangeRateEntity[]> {
    const history = this.priceHistory.get(pair) || [];
    return history.slice(-limit);
  }

  async findByPairAndHour(pair: ExchangePair, hour: Date): Promise<ExchangeRateEntity[]> {
    const history = this.priceHistory.get(pair) || [];
    const hourStart = new Date(hour);
    hourStart.setMinutes(0, 0, 0);
    hourStart.setMilliseconds(0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

    return history.filter((rate) => {
      const timestamp = rate.timestamp.getTime();
      return timestamp >= hourStart.getTime() && timestamp < hourEnd.getTime();
    });
  }

  async getLatestHourlyAverage(pair: ExchangePair): Promise<HourlyAverageEntity | null> {
    const release = await this.fileMutex.acquire();
    try {
      const storageData = await this.loadStorageData();
      const keyPrefix = `${pair}-`;
      let latest: HourlyAverageEntity | null = null;
      let latestTime = 0;

      for (const [key, data] of Object.entries(storageData.hourlyAverages)) {
        if (key.startsWith(keyPrefix)) {
          const hour = new Date(data.hour);
          const time = hour.getTime();
          if (time > latestTime) {
            latestTime = time;
            latest = this.dataToHourlyAverage(data);
          }
        }
      }

      return latest;
    } finally {
      release();
    }
  }

  async saveHourlyAverage(average: HourlyAverageEntity): Promise<void> {
    await this.atomicFileOperation(async (storageData) => {
      const key = average.getKey();
      storageData.hourlyAverages[key] = this.hourlyAverageToData(average);
      return { data: storageData, result: undefined };
    });
  }

  async getAllHourlyAverages(pair: ExchangePair): Promise<HourlyAverageEntity[]> {
    const release = await this.fileMutex.acquire();
    try {
      const storageData = await this.loadStorageData();
      const keyPrefix = `${pair}-`;
      const averages: HourlyAverageEntity[] = [];

      for (const [key, data] of Object.entries(storageData.hourlyAverages)) {
        if (key.startsWith(keyPrefix)) {
          averages.push(this.dataToHourlyAverage(data));
        }
      }

      return averages.sort((a, b) => b.hour.getTime() - a.hour.getTime());
    } finally {
      release();
    }
  }
}

