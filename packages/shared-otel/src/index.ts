import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

// ============================================================================
// TYPES
// ============================================================================

export interface TracingOptions {
  serviceName: string;
  serviceVersion?: string;
  endpoint?: string;
  enabled?: boolean;
  metricsEnabled?: boolean;
}

// ============================================================================
// OPENTELEMETRY SDK INITIALIZATION
// ============================================================================

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry tracing for a service
 */
export function initTracing(options: TracingOptions): NodeSDK | null {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
    enabled = true,
    metricsEnabled = true,
  } = options;

  if (!enabled) {
    console.log('[OpenTelemetry] Tracing is disabled');
    return null;
  }

  if (sdk) {
    console.warn('[OpenTelemetry] SDK already initialized');
    return sdk;
  }

  try {
    console.log(`[OpenTelemetry] Initializing for service: ${serviceName}`);
    console.log(`[OpenTelemetry] Endpoint: ${endpoint}`);

    // Create resource with service information
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
    });

    // Create trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: endpoint,
    });

    // Create metric exporter (optional)
    const metricExporter = metricsEnabled
      ? new OTLPMetricExporter({
          url: endpoint,
        })
      : undefined;

    // Initialize SDK
    sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: metricExporter ? undefined : undefined, // TODO: Add PeriodicExportingMetricReader
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable/configure specific instrumentations as needed
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Often too noisy
          },
        }),
      ],
    });

    // Start the SDK
    sdk.start();

    console.log('[OpenTelemetry] Initialized successfully');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await shutdownTracing();
      process.exit(0);
    });

    return sdk;
  } catch (error) {
    console.error('[OpenTelemetry] Failed to initialize:', error);
    return null;
  }
}

/**
 * Shutdown OpenTelemetry SDK gracefully
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    try {
      console.log('[OpenTelemetry] Shutting down...');
      await sdk.shutdown();
      console.log('[OpenTelemetry] Shutdown complete');
      sdk = null;
    } catch (error) {
      console.error('[OpenTelemetry] Error during shutdown:', error);
    }
  }
}

// ============================================================================
// TRACING HELPERS
// ============================================================================

/**
 * Get the tracer for the current service
 */
export function getTracer(serviceName: string) {
  return trace.getTracer(serviceName);
}

/**
 * Create a span and execute a function within its context
 */
export async function withSpan<T>(
  spanName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = trace.getTracer('default');
  const span = tracer.startSpan(spanName);

  if (attributes) {
    span.setAttributes(attributes);
  }

  try {
    const result = await context.with(trace.setSpan(context.active(), span), fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Get the current trace context as an object
 */
export function getTraceContext(): { traceId?: string; spanId?: string } {
  const span = trace.getActiveSpan();
  if (!span) {
    return {};
  }

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

/**
 * Add attributes to the current active span
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Add an event to the current active span
 */
export function addSpanEvent(name: string, attributes?: Record<string, unknown>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes as any);
  }
}

/**
 * Record an exception in the current active span
 */
export function recordException(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Extract trace ID from headers (for correlation)
 */
export function extractTraceIdFromHeaders(headers: Record<string, string | string[] | undefined>): string | undefined {
  const traceParent = Array.isArray(headers['traceparent'])
    ? headers['traceparent'][0]
    : headers['traceparent'];

  if (traceParent) {
    // traceparent format: version-trace_id-parent_id-trace_flags
    const parts = traceParent.split('-');
    if (parts.length >= 2) {
      return parts[1];
    }
  }

  return undefined;
}

// Re-export OpenTelemetry API for convenience
export { trace, context, SpanStatusCode } from '@opentelemetry/api';

