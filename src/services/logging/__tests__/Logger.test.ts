import { Logger, logger } from '../Logger';
import type { LogLevel, LogContext, LoggerConfig } from '../Logger';

describe('Logger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('log levels', () => {
    it('should support debug level', () => {
      const testLogger = new Logger({ minLevel: 'debug' });
      testLogger.debug('debug message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const [logOutput] = consoleSpy.log.mock.calls[0] as [string];
      expect(logOutput).toContain('[DEBUG]');
      expect(logOutput).toContain('debug message');
    });

    it('should support info level', () => {
      const testLogger = new Logger({ minLevel: 'debug' });
      testLogger.info('info message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const [logOutput] = consoleSpy.log.mock.calls[0] as [string];
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('info message');
    });

    it('should support warn level', () => {
      const testLogger = new Logger({ minLevel: 'debug' });
      testLogger.warn('warn message');

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      const [logOutput] = consoleSpy.warn.mock.calls[0] as [string];
      expect(logOutput).toContain('[WARN]');
      expect(logOutput).toContain('warn message');
    });

    it('should support error level', () => {
      const testLogger = new Logger({ minLevel: 'debug' });
      testLogger.error('error message');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const [logOutput] = consoleSpy.error.mock.calls[0] as [string];
      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('error message');
    });
  });

  describe('context object support', () => {
    it('should accept context object with arbitrary key-value pairs', () => {
      const testLogger = new Logger({ minLevel: 'debug' });
      const context: LogContext = {
        userId: '123',
        action: 'import',
        count: 42,
        nested: { key: 'value' },
      };

      testLogger.info('message with context', context);

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const [logOutput, contextArg] = consoleSpy.log.mock.calls[0] as [string, LogContext];
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('message with context');
      expect(contextArg).toEqual(context);
    });

    it('should handle undefined context', () => {
      const testLogger = new Logger({ minLevel: 'debug' });
      testLogger.info('message without context');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const [logOutput, contextArg] = consoleSpy.log.mock.calls[0] as [string, string];
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('message without context');
      expect(contextArg).toBe('');
    });
  });

  describe('timestamp in log entries', () => {
    it('should include ISO timestamp in all log entries', () => {
      const testLogger = new Logger({ minLevel: 'debug' });

      testLogger.info('timestamped message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const [logOutput] = consoleSpy.log.mock.calls[0] as [string];
      // Check for ISO timestamp format: [YYYY-MM-DDTHH:MM:SS
      expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('environment-based level filtering', () => {
    it('should filter out debug logs when minLevel is info', () => {
      const testLogger = new Logger({ minLevel: 'info' });

      testLogger.debug('should not appear');
      testLogger.info('should appear');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const [logOutput] = consoleSpy.log.mock.calls[0] as [string];
      expect(logOutput).toContain('[INFO]');
    });

    it('should filter out debug and info logs when minLevel is warn', () => {
      const testLogger = new Logger({ minLevel: 'warn' });

      testLogger.debug('should not appear');
      testLogger.info('should not appear');
      testLogger.warn('should appear');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    });

    it('should only show error logs when minLevel is error', () => {
      const testLogger = new Logger({ minLevel: 'error' });

      testLogger.debug('should not appear');
      testLogger.info('should not appear');
      testLogger.warn('should not appear');
      testLogger.error('should appear');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should suppress debug level logs in production (minLevel: warn)', () => {
      // Simulating production environment by setting minLevel to warn
      const productionLogger = new Logger({ minLevel: 'warn' });

      productionLogger.debug('debug message');
      productionLogger.info('info message');
      productionLogger.warn('warn message');
      productionLogger.error('error message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuration', () => {
    it('should allow disabling console output', () => {
      const testLogger = new Logger({ minLevel: 'debug', enableConsole: false });

      testLogger.debug('message');
      testLogger.info('message');
      testLogger.warn('message');
      testLogger.error('message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should return current configuration via getConfig', () => {
      const config: Partial<LoggerConfig> = { minLevel: 'info', enableConsole: false };
      const testLogger = new Logger(config);

      const currentConfig = testLogger.getConfig();

      expect(currentConfig.minLevel).toBe('info');
      expect(currentConfig.enableConsole).toBe(false);
    });

    it('should allow updating configuration via setConfig', () => {
      const testLogger = new Logger({ minLevel: 'debug' });

      testLogger.setConfig({ minLevel: 'error' });

      testLogger.debug('should not appear');
      testLogger.warn('should not appear');
      testLogger.error('should appear');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should have default configuration based on __DEV__', () => {
      const config = logger.getConfig();
      // In test environment, __DEV__ is typically true
      expect(config.enableConsole).toBe(true);
      expect(['debug', 'info', 'warn', 'error']).toContain(config.minLevel);
    });
  });

  describe('log level ordering', () => {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

    levels.forEach((minLevel, minIndex) => {
      it(`should log ${levels.slice(minIndex).join(', ')} when minLevel is ${minLevel}`, () => {
        const testLogger = new Logger({ minLevel });

        testLogger.debug('debug');
        testLogger.info('info');
        testLogger.warn('warn');
        testLogger.error('error');

        // Count expected calls
        const expectedLogCalls = levels
          .slice(minIndex)
          .filter((l) => l === 'debug' || l === 'info').length;
        const expectedWarnCalls = levels.slice(minIndex).filter((l) => l === 'warn').length;
        const expectedErrorCalls = levels.slice(minIndex).filter((l) => l === 'error').length;

        expect(consoleSpy.log).toHaveBeenCalledTimes(expectedLogCalls);
        expect(consoleSpy.warn).toHaveBeenCalledTimes(expectedWarnCalls);
        expect(consoleSpy.error).toHaveBeenCalledTimes(expectedErrorCalls);
      });
    });
  });
});
