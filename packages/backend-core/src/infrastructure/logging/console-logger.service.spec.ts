import { ConsoleLoggerService } from './console-logger.service.js';
import { LogLevel } from '../../application/ports/logger.port.js';

describe('ConsoleLoggerService', () => {
  let logger: ConsoleLoggerService;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('with default INFO level', () => {
    beforeEach(() => {
      logger = new ConsoleLoggerService();
    });

    it('should not log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Info message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info message');
    });

    it('should log warn messages', () => {
      logger.warn('Warn message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warn message');
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error message', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message', error);
    });

    it('should log error messages without error object', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message', undefined);
    });

    it('should pass additional arguments to console methods', () => {
      logger.info('Info message', 'arg1', 'arg2');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info message', 'arg1', 'arg2');
    });
  });

  describe('with DEBUG level', () => {
    beforeEach(() => {
      logger = new ConsoleLoggerService(LogLevel.DEBUG);
    });

    it('should log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Debug message');
    });

    it('should log info messages', () => {
      logger.info('Info message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info message');
    });

    it('should log warn messages', () => {
      logger.warn('Warn message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warn message');
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error message', undefined);
    });
  });

  describe('with INFO level', () => {
    beforeEach(() => {
      logger = new ConsoleLoggerService(LogLevel.INFO);
    });

    it('should not log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Info message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('Warn message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('with WARN level', () => {
    beforeEach(() => {
      logger = new ConsoleLoggerService(LogLevel.WARN);
    });

    it('should not log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should not log info messages', () => {
      logger.info('Info message');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('Warn message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('with ERROR level', () => {
    beforeEach(() => {
      logger = new ConsoleLoggerService(LogLevel.ERROR);
    });

    it('should not log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should not log info messages', () => {
      logger.info('Info message');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should not log warn messages', () => {
      logger.warn('Warn message');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});

