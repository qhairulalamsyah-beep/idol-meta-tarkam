/**
 * Structured Logging Utility
 * 
 * Features:
 * - Environment-aware formatting (pretty for dev, JSON for prod)
 * - Log levels: debug, info, warn, error
 * - Context/metadata support
 * - Request/Response logging for API
 * - Performance timing
 */

import { getConfig } from '@/lib/config';

// ============================================
// TYPES
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================
// LOG LEVEL PRIORITY
// ============================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel, configuredLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLevel];
}

// ============================================
// FORMATTERS
// ============================================

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.cyan,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red,
};

function formatPretty(entry: LogEntry): string {
  const timestamp = COLORS.dim + entry.timestamp + COLORS.reset;
  const level = LEVEL_COLORS[entry.level] + entry.level.toUpperCase().padEnd(5) + COLORS.reset;
  
  let output = `${timestamp} | ${level} | ${entry.message}`;
  
  if (entry.context && Object.keys(entry.context).length > 0) {
    output += `\n  ${COLORS.dim}Context:${COLORS.reset} ${JSON.stringify(entry.context, null, 2).split('\n').join('\n  ')}`;
  }
  
  if (entry.duration !== undefined) {
    output += ` ${COLORS.magenta}[${entry.duration}ms]${COLORS.reset}`;
  }
  
  if (entry.error) {
    output += `\n  ${COLORS.red}Error: ${entry.error.name}: ${entry.error.message}${COLORS.reset}`;
    if (entry.error.stack) {
      output += `\n  ${COLORS.dim}${entry.error.stack.split('\n').join('\n  ')}${COLORS.reset}`;
    }
  }
  
  return output;
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify({
    ...entry,
    // Production: flatten error for better parsing
    ...(entry.error && {
      errorName: entry.error.name,
      errorMessage: entry.error.message,
      errorStack: entry.error.stack,
    }),
  });
}

// ============================================
// LOGGER CLASS
// ============================================

class Logger {
  private context: LogContext = {};
  private configuredLevel: LogLevel = 'info';
  private format: 'pretty' | 'json' = 'pretty';

  constructor() {
    // Initialize from config
    try {
      const config = getConfig();
      this.configuredLevel = config.log.level;
      this.format = config.log.format;
    } catch {
      // Config not ready yet, use defaults
    }
  }

  /**
   * Set default context for all logs in this logger instance
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Log at debug level (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const entry: LogEntry = this.createEntry('error', message, context);
    
    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      entry.context = { ...entry.context, error };
    }
    
    this.output(entry);
  }

  /**
   * Log API request
   */
  request(method: string, path: string, context?: LogContext): void {
    this.log('info', `→ ${method} ${path}`, { type: 'request', method, path, ...context });
  }

  /**
   * Log API response
   */
  response(method: string, path: string, status: number, duration: number, context?: LogContext): void {
    const level = status >= 400 ? 'warn' : 'info';
    this.log(level, `← ${method} ${path} ${status}`, { 
      type: 'response', 
      method, 
      path, 
      status, 
      duration 
    }, context);
  }

  /**
   * Time an operation
   */
  time<T>(label: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = Date.now();
    this.debug(`⏱ ${label} started`);
    
    const result = fn();
    
    if (result instanceof Promise) {
      return result
        .then((value) => {
          const duration = Date.now() - start;
          this.debug(`⏱ ${label} completed`, { duration });
          return value;
        })
        .catch((error) => {
          const duration = Date.now() - start;
          this.error(`⏱ ${label} failed`, error, { duration });
          throw error;
        });
    }
    
    const duration = Date.now() - start;
    this.debug(`⏱ ${label} completed`, { duration });
    return result;
  }

  /**
   * Create a timer that returns elapsed time
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level, this.configuredLevel)) return;
    const entry = this.createEntry(level, message, context);
    this.output(entry);
  }

  private createEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };
  }

  private output(entry: LogEntry): void {
    const formatted = this.format === 'json' 
      ? formatJson(entry) 
      : formatPretty(entry);
    
    switch (entry.level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const logger = new Logger();

// Create namespaced loggers for different modules
export const apiLogger = logger.child({ module: 'api' });
export const dbLogger = logger.child({ module: 'database' });
export const authLogger = logger.child({ module: 'auth' });
export const botLogger = logger.child({ module: 'bot' });

// ============================================
// API ROUTE HELPER
// ============================================

interface ApiHandlerOptions {
  method: string;
  path: string;
}

/**
 * Wrap API handler with automatic logging
 */
export function withApiLogging<T>(
  options: ApiHandlerOptions,
  handler: () => T | Promise<T>
): T | Promise<T> {
  const timer = apiLogger.startTimer();
  apiLogger.request(options.method, options.path);
  
  try {
    const result = handler();
    
    if (result instanceof Promise) {
      return result
        .then((value) => {
          apiLogger.response(options.method, options.path, 200, timer());
          return value;
        })
        .catch((error) => {
          const status = error instanceof Response ? error.status : 500;
          apiLogger.response(options.method, options.path, status, timer());
          throw error;
        });
    }
    
    apiLogger.response(options.method, options.path, 200, timer());
    return result;
  } catch (error) {
    const status = error instanceof Response ? error.status : 500;
    apiLogger.response(options.method, options.path, status, timer());
    throw error;
  }
}
