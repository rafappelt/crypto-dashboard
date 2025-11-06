import { ConsoleLoggerService } from './console-logger.service.js';
import { LogLevel, ILogger } from '../../application/ports/logger.port.js';

export const createDefaultLogger = (): ILogger => {
  const level = process.env.LOG_LEVEL
    ? (LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel] ?? LogLevel.INFO)
    : LogLevel.INFO;

  return new ConsoleLoggerService(level);
};

export const logger: ILogger = createDefaultLogger();
