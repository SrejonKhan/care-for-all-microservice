
// Structured JSON logger for microservices
// Outputs to stdout for container log collection by Filebeat

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  serviceName: string;
  timestamp: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

export interface LoggerOptions {
  serviceName: string;
  minLevel?: LogLevel;
  prettyPrint?: boolean;
}

export interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

// ============================================================================
// LOGGER CLASS
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private prettyPrint: boolean;
  private context: LogContext;

  constructor(options: LoggerOptions) {
    this.serviceName = options.serviceName;
    this.minLevel = options.minLevel || 'info';
    this.prettyPrint = options.prettyPrint || false;
    this.context = {};
  }

  /**
   * Set context that will be included in all subsequent logs
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
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger({
      serviceName: this.serviceName,
      minLevel: this.minLevel,
      prettyPrint: this.prettyPrint,
    });
    child.context = { ...this.context, ...context };
    return child;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      serviceName: this.serviceName,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...meta,
    };

    const output = this.prettyPrint
      ? this.formatPretty(logEntry)
      : JSON.stringify(logEntry);

    console.log(output);
  }

  private formatPretty(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    return `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.serviceName}: ${entry.message}`;
  }

  /**
   * Log at debug level
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  /**
   * Log at info level
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  /**
   * Log at warn level
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta = error instanceof Error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : error
      ? { error }
      : {};

    this.log('error', message, { ...errorMeta, ...meta });
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new logger instance
 */
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract trace context from OpenTelemetry or create new
 */
export function extractTraceContext(): LogContext {
  // This would integrate with OpenTelemetry API in a real implementation
  // For now, return empty object as placeholder
  // TODO: Integrate with @opentelemetry/api to extract active span context
  return {};
}

/**
 * Generate a request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// MIDDLEWARE HELPER
// ============================================================================

/**
 * Create logging middleware context for HTTP requests
 */
export function createRequestContext(req: {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}): LogContext {
  const requestId = generateRequestId();
  const traceContext = extractTraceContext();

  return {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: Array.isArray(req.headers?.['user-agent']) 
      ? req.headers['user-agent'][0] 
      : req.headers?.['user-agent'],
    ...traceContext,
  };
}

/**
 * Create HTTP request logging middleware
 * Logs all HTTP requests in JSON format
 */
export function createHttpLoggingMiddleware(logger: Logger) {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        responseTime: `${duration}ms`,
        contentLength: res.get('content-length'),
        userAgent: req.get('user-agent'),
        remoteAddr: req.ip || req.connection.remoteAddress,
      });
    });
    
    next();
  };
}
