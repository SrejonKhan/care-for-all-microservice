import { z } from 'zod';

// ============================================================================
// ENVIRONMENT VARIABLE SCHEMAS
// ============================================================================

const baseConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  SERVICE_NAME: z.string(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const databaseConfigSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  DB_POOL_MIN: z.string().default('2').transform(Number),
  DB_POOL_MAX: z.string().default('10').transform(Number),
});

const rabbitmqConfigSchema = z.object({
  RABBITMQ_URL: z.string().url().optional(),
  RABBITMQ_EXCHANGE: z.string().default('care-for-all'),
  RABBITMQ_QUEUE_PREFIX: z.string().default(''),
});

const otelConfigSchema = z.object({
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_TRACES_ENABLED: z.string().default('true').transform(val => val === 'true'),
  OTEL_METRICS_ENABLED: z.string().default('true').transform(val => val === 'true'),
});

const serviceUrlsSchema = z.object({
  GATEWAY_URL: z.string().url().default('http://gateway:3000'),
  AUTH_SERVICE_URL: z.string().url().default('http://auth-service:3000'),
  CAMPAIGN_SERVICE_URL: z.string().url().default('http://campaign-service:3000'),
  DONATION_SERVICE_URL: z.string().url().default('http://donation-service:3000'),
  PAYMENT_SERVICE_URL: z.string().url().default('http://payment-service:3000'),
  TOTALS_SERVICE_URL: z.string().url().default('http://totals-service:3000'),
  CHAT_SERVICE_URL: z.string().url().default('http://chat-service:3000'),
});

const securityConfigSchema = z.object({
  INTERNAL_SERVICE_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('24h'),
});

// Combined config schema
const fullConfigSchema = baseConfigSchema
  .merge(databaseConfigSchema)
  .merge(rabbitmqConfigSchema)
  .merge(otelConfigSchema)
  .merge(serviceUrlsSchema)
  .merge(securityConfigSchema);

// ============================================================================
// TYPES
// ============================================================================

export type Config = z.infer<typeof fullConfigSchema>;
export type BaseConfig = z.infer<typeof baseConfigSchema>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type RabbitMQConfig = z.infer<typeof rabbitmqConfigSchema>;
export type OtelConfig = z.infer<typeof otelConfigSchema>;
export type ServiceUrls = z.infer<typeof serviceUrlsSchema>;
export type SecurityConfig = z.infer<typeof securityConfigSchema>;

// ============================================================================
// CONFIG LOADER
// ============================================================================

export interface LoadConfigOptions {
  serviceName: string;
  required?: {
    database?: boolean;
    rabbitmq?: boolean;
    otel?: boolean;
    security?: boolean;
  };
  customEnv?: Record<string, string>;
}

/**
 * Load and validate configuration from environment variables
 * @param options Configuration options
 * @returns Validated configuration object
 * @throws Error if required configuration is missing or invalid
 */
export function loadConfig(options: LoadConfigOptions): Config {
  const { serviceName, required = {}, customEnv } = options;

  // Use custom env or process.env
  const env = customEnv || process.env;

  // Prepare environment with service name
  const envWithDefaults = {
    ...env,
    SERVICE_NAME: serviceName,
    OTEL_SERVICE_NAME: env.OTEL_SERVICE_NAME || serviceName,
  };

  try {
    // Parse and validate
    const config = fullConfigSchema.parse(envWithDefaults);

    // Check required configurations
    if (required.database && !config.DATABASE_URL) {
      throw new Error('DATABASE_URL is required but not provided');
    }

    if (required.rabbitmq && !config.RABBITMQ_URL) {
      throw new Error('RABBITMQ_URL is required but not provided');
    }

    if (required.otel && !config.OTEL_EXPORTER_OTLP_ENDPOINT) {
      throw new Error('OTEL_EXPORTER_OTLP_ENDPOINT is required but not provided');
    }

    if (required.security && !config.INTERNAL_SERVICE_SECRET) {
      console.warn('Warning: INTERNAL_SERVICE_SECRET not set. Service-to-service auth disabled.');
    }

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new Error(`Configuration validation failed: ${issues}`);
    }
    throw error;
  }
}

/**
 * Get a specific subset of configuration
 */
export function getDatabaseConfig(config: Config): DatabaseConfig {
  return {
    DATABASE_URL: config.DATABASE_URL,
    DB_POOL_MIN: config.DB_POOL_MIN,
    DB_POOL_MAX: config.DB_POOL_MAX,
  };
}

export function getRabbitMQConfig(config: Config): RabbitMQConfig {
  return {
    RABBITMQ_URL: config.RABBITMQ_URL,
    RABBITMQ_EXCHANGE: config.RABBITMQ_EXCHANGE,
    RABBITMQ_QUEUE_PREFIX: config.RABBITMQ_QUEUE_PREFIX,
  };
}

export function getOtelConfig(config: Config): OtelConfig {
  return {
    OTEL_EXPORTER_OTLP_ENDPOINT: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_SERVICE_NAME: config.OTEL_SERVICE_NAME,
    OTEL_TRACES_ENABLED: config.OTEL_TRACES_ENABLED,
    OTEL_METRICS_ENABLED: config.OTEL_METRICS_ENABLED,
  };
}

export function getServiceUrls(config: Config): ServiceUrls {
  return {
    GATEWAY_URL: config.GATEWAY_URL,
    AUTH_SERVICE_URL: config.AUTH_SERVICE_URL,
    CAMPAIGN_SERVICE_URL: config.CAMPAIGN_SERVICE_URL,
    DONATION_SERVICE_URL: config.DONATION_SERVICE_URL,
    PAYMENT_SERVICE_URL: config.PAYMENT_SERVICE_URL,
    TOTALS_SERVICE_URL: config.TOTALS_SERVICE_URL,
    CHAT_SERVICE_URL: config.CHAT_SERVICE_URL,
  };
}

export function getSecurityConfig(config: Config): SecurityConfig {
  return {
    INTERNAL_SERVICE_SECRET: config.INTERNAL_SERVICE_SECRET,
    JWT_SECRET: config.JWT_SECRET,
    JWT_EXPIRES_IN: config.JWT_EXPIRES_IN,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if running in production
 */
export function isProduction(config: Config): boolean {
  return config.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(config: Config): boolean {
  return config.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(config: Config): boolean {
  return config.NODE_ENV === 'test';
}

