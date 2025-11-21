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

  /**
   * Core log method
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    // Check if log level is enabled
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      serviceName: this.serviceName,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...meta,
    };

    // Output to stdout
    if (this.prettyPrint) {
      this.prettyLog(entry);
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Pretty print for development
   */
  private prettyLog(entry: LogEntry): void {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    const color = colors[entry.level];

    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `${color}[${entry.level.toUpperCase()}]${reset} ${timestamp} [${entry.serviceName}]`;
    
    console.log(`${prefix} ${entry.message}`);
    
    // Print additional metadata if present
    const { level, message, serviceName, timestamp: ts, ...meta } = entry;
    if (Object.keys(meta).length > 0) {
      console.log('  ', JSON.stringify(meta, null, 2));
    }
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

