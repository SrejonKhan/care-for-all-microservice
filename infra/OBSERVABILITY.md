# Observability & Monitoring Stack

## Architecture Overview

The CareForAll platform implements a comprehensive observability stack with three pillars:

### 1. **LOGS** (Winston + Morgan → Filebeat → Logstash → Elasticsearch → Grafana)
- **Winston**: Production-grade logging library for structured JSON logs
- **Morgan**: HTTP request logging middleware
- **Filebeat**: Lightweight log shipper that collects container logs
- **Logstash**: Log aggregation and transformation pipeline
- **Elasticsearch**: Distributed search and analytics engine for log storage
- **Grafana**: Unified visualization dashboard

### 2. **TRACES** (OpenTelemetry → Jaeger → Grafana)
- **OpenTelemetry SDK**: Instrumentation for distributed tracing
- **OTEL Collector**: Vendor-agnostic telemetry data collector
- **Jaeger**: Distributed tracing backend
- **Grafana**: Trace visualization and correlation with logs

### 3. **METRICS** (OTEL + Node Exporter + cAdvisor → Prometheus → Grafana)
- **OpenTelemetry Metrics**: Application-level metrics
- **Node Exporter**: Host-level system metrics (CPU, memory, disk, network)
- **cAdvisor**: Container metrics (resource usage, performance)
- **Prometheus**: Time-series metrics database
- **Grafana**: Metrics visualization and alerting

## Quick Start

### Start Observability Stack

```powershell
cd infra
./start-observability.ps1
```

Or manually:

```bash
docker compose up -d elasticsearch logstash filebeat jaeger otel-collector prometheus node-exporter cadvisor grafana kibana
```

### Access Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** (Main) | http://localhost:3003 | admin / admin |
| Elasticsearch | http://localhost:9200 | - |
| Kibana | http://localhost:5601 | - |
| Jaeger UI | http://localhost:16686 | - |
| Prometheus | http://localhost:9090 | - |
| cAdvisor | http://localhost:8081 | - |

## Grafana Dashboards

Three pre-configured dashboards are available:

1. **Application Logs** (`logs-dashboard`)
   - Log volume by service
   - Log levels distribution
   - Error logs stream
   - Searchable log table

2. **Distributed Traces** (`traces-dashboard`)
   - Request rate by service
   - Response time metrics
   - Service dependency graph
   - Slowest traces analysis

3. **System Metrics** (`metrics-dashboard`)
   - CPU usage by container
   - Memory usage by container
   - Network I/O
   - Disk I/O
   - HTTP request rates
   - Response time percentiles (p95)
   - Database connection pools
   - System load averages

## Data Flow

### Logging Pipeline
```
Application Services (Winston/Morgan)
  ↓ (JSON logs to stdout)
Docker Container Logs
  ↓
Filebeat (Log collection from /var/lib/docker/containers)
  ↓
Logstash (Log parsing, enrichment, filtering)
  ↓
Elasticsearch (Log storage with date-based indices: logs-YYYY.MM.DD)
  ↓
Grafana (Log visualization, search, and analysis)
```

### Tracing Pipeline
```
Application Code (OpenTelemetry SDK)
  ↓ (OTLP gRPC/HTTP)
OTEL Collector (Trace collection, processing, batching)
  ↓
Jaeger (Trace storage and query)
  ↓
Grafana (Trace visualization, connected to logs via trace_id)
```

### Metrics Pipeline
```
Application (OTEL Metrics) + Node Exporter + cAdvisor
  ↓
OTEL Collector (Metrics processing)
  ↓ (Prometheus format)
Prometheus (Metrics scraping and storage)
  ↓
Grafana (Metrics visualization and alerting)
```

## Configuration Files

### Core Configurations
- `filebeat.yml` - Filebeat configuration for container log collection
- `logstash.conf` - Logstash pipeline for log parsing and enrichment
- `otel-collector-config.yml` - OpenTelemetry Collector configuration
- `prometheus.yml` - Prometheus scrape configurations
- `grafana/provisioning/datasources/` - Pre-configured data sources
- `grafana/provisioning/dashboards/` - Pre-built dashboard definitions

### Service Labels
All application services have logging labels for Filebeat filtering:
```yaml
labels:
  logging: "true"
  service: "service-name"
  tier: "backend"
```

## Log Correlation

Logs, traces, and metrics are correlated using:
- **trace_id**: Links logs to distributed traces
- **service**: Identifies the source service
- **timestamp**: Temporal correlation across all data sources

Example: Click on a trace in Jaeger → See related logs in Elasticsearch automatically

## Monitoring Best Practices

### For Developers
1. Use structured logging with meaningful context
2. Include trace_id in all log entries
3. Log at appropriate levels (debug, info, warn, error)
4. Add custom metrics for business logic
5. Use HTTP request logging via Morgan

### Log Levels
- `debug`: Detailed diagnostic information
- `info`: General informational messages
- `warn`: Warning messages for potentially harmful situations
- `error`: Error events that might still allow the application to continue

### Custom Metrics Examples
```typescript
// Counter
otel.metrics.createCounter('donations_total');

// Histogram
otel.metrics.createHistogram('donation_amount');

// Gauge
otel.metrics.createGauge('active_campaigns');
```

## Scaling Considerations

### Elasticsearch
- Current: Single node
- Production: 3-node cluster with replicas
- Retention: Configure ILM policies for log rotation

### Prometheus
- Current: 15s scrape interval
- Production: Adjust based on cardinality and load
- Use recording rules for heavy queries

### Filebeat
- Current: 2 workers
- Production: Scale based on log volume
- Consider using Kafka for buffering

## Troubleshooting

### Logs not appearing in Elasticsearch
```bash
# Check Filebeat status
docker logs filebeat

# Check Logstash pipeline
docker logs logstash

# Verify Elasticsearch health
curl http://localhost:9200/_cluster/health
```

### Traces not showing in Jaeger
```bash
# Check OTEL Collector
docker logs otel-collector

# Verify Jaeger backend
curl http://localhost:16686/api/services
```

### Metrics missing in Prometheus
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify OTEL Collector metrics endpoint
curl http://localhost:8889/metrics
```

## Production Checklist

- [ ] Set strong Elasticsearch passwords
- [ ] Configure TLS for all services
- [ ] Set up log retention policies
- [ ] Configure alerting rules in Grafana
- [ ] Set up backup for Prometheus data
- [ ] Configure Elasticsearch snapshots
- [ ] Set resource limits for all containers
- [ ] Enable authentication for all UIs
- [ ] Configure firewall rules
- [ ] Set up log rotation

## Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Morgan Documentation](https://github.com/expressjs/morgan)
- [Filebeat Reference](https://www.elastic.co/guide/en/beats/filebeat/current/index.html)
- [Logstash Documentation](https://www.elastic.co/guide/en/logstash/current/index.html)
- [OpenTelemetry](https://opentelemetry.io/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Prometheus](https://prometheus.io/docs/)
- [Grafana](https://grafana.com/docs/)
