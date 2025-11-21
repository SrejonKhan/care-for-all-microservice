# Infrastructure Documentation

This directory contains all infrastructure configuration for the Care For All microservices platform.

## Quick Start

```bash
cd infra
docker compose up --build
```

This single command will start all 21 services including:
- 7 microservices (gateway, auth, campaign, pledge, payment, totals, chat)
- 1 frontend application
- PostgreSQL database
- RabbitMQ message broker
- Full observability stack (11 services)

## Services Overview

### Application Services (8)

**Backend Services:**
| Service | Port | Description |
|---------|------|-------------|
| gateway | 8080 | API Gateway - main entry point |
| auth-service | 3000 (internal) | Authentication & authorization |
| campaign-service | 3000 (internal) | Campaign management |
| donation-service | 3000 (internal) | Donation state machine |
| payment-service | 3000 (internal) | Payment processing |
| totals-service | 3000 (internal) | Campaign totals (materialized view) |
| chat-service | 3000 (internal) | Real-time chat with WebSocket |

**Frontend:**
| Service | Port | Description |
|---------|------|-------------|
| admin-frontend | 3002 | Admin panel UI |

### Data & Messaging (2)

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 (internal) | Primary database |
| rabbitmq | 15672 | Message broker + Management UI |

### Observability Stack (11)

#### Tracing & Metrics (5)
| Service | Port | Description |
|---------|------|-------------|
| otel-collector | 4317, 4318, 8889 | OpenTelemetry collector |
| jaeger | 16686 | Distributed tracing UI |
| prometheus | 9090 | Metrics collection |
| node-exporter | 9100 (internal) | Host metrics |
| cadvisor | 8081 | Container metrics |

#### Logging - ELK Stack (4)
| Service | Port | Description |
|---------|------|-------------|
| elasticsearch | 9200 | Log storage |
| logstash | 5044 (internal) | Log processing pipeline |
| kibana | 5601 | Log exploration UI |
| filebeat | N/A | Container log shipper |

#### Visualization (2)
| Service | Port | Description |
|---------|------|-------------|
| grafana | 3001 | Dashboards & visualization |

## Configuration Files

### Observability Configurations

- **prometheus.yml** - Prometheus scrape configuration
  - Scrapes: otel-collector, node-exporter, cadvisor
  - Interval: 15s

- **otel-collector-config.yml** - OpenTelemetry Collector configuration
  - Receives: OTLP traces, metrics, logs via gRPC (4317) and HTTP (4318)
  - Exports: Traces to Jaeger, Metrics to Prometheus

- **logstash.conf** - Logstash pipeline configuration
  - Input: Beats (port 5044)
  - Filters: JSON parsing, metadata enrichment
  - Output: Elasticsearch with daily indices (logs-YYYY.MM.dd)

- **filebeat.yml** - Filebeat configuration
  - Input: Docker container logs
  - Output: Logstash
  - Processors: add_docker_metadata, drop_fields

- **grafana/provisioning/** - Grafana datasources and dashboards
  - Datasources: Prometheus, Jaeger, Elasticsearch
  - Auto-provisioned on startup

## Access Points

Once all services are running:

| Service | URL | Credentials |
|---------|-----|-------------|
| API Gateway | http://localhost:8080 | N/A |
| API Docs (Scalar) | http://localhost:8080/docs | N/A |
| Admin Panel | http://localhost:3002 | N/A |
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | N/A |
| Jaeger | http://localhost:16686 | N/A |
| Kibana | http://localhost:5601 | N/A |
| Elasticsearch | http://localhost:9200 | N/A |
| RabbitMQ UI | http://localhost:15672 | guest/guest |
| cAdvisor | http://localhost:8081 | N/A |

## Environment Variables

All services use environment variables for configuration. Default values are set in `docker-compose.yml`.

Key environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry collector endpoint
- `INTERNAL_SERVICE_SECRET` - Secret for service-to-service authentication
- `JWT_SECRET` - JWT signing secret for auth service

## Development Workflow

### Start all services
```bash
docker compose up
```

### Start with rebuild
```bash
docker compose up --build
```

### Start specific services
```bash
docker compose up gateway postgres rabbitmq
```

### View logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f gateway

# Multiple services
docker compose logs -f gateway campaign-service
```

### Stop all services
```bash
docker compose down
```

### Stop and remove volumes
```bash
docker compose down -v
```

## Troubleshooting

### Services failing to start

1. Check if ports are already in use:
```bash
lsof -i :8080  # Gateway
lsof -i :5432  # PostgreSQL
lsof -i :5672  # RabbitMQ
```

2. Check service logs:
```bash
docker compose logs <service-name>
```

3. Restart specific service:
```bash
docker compose restart <service-name>
```

### Database connection issues

If services can't connect to PostgreSQL:

1. Check PostgreSQL is running:
```bash
docker compose ps postgres
```

2. Check PostgreSQL logs:
```bash
docker compose logs postgres
```

3. Wait for PostgreSQL to be ready (it has a health check)

### RabbitMQ connection issues

1. Check RabbitMQ is running:
```bash
docker compose ps rabbitmq
```

2. Access RabbitMQ management UI: http://localhost:15672
   - Username: guest
   - Password: guest

### Observability not working

1. Check OpenTelemetry Collector logs:
```bash
docker compose logs otel-collector
```

2. Verify Prometheus is scraping targets: http://localhost:9090/targets

3. Check Filebeat is shipping logs:
```bash
docker compose logs filebeat
```

4. Verify Elasticsearch indices:
```bash
curl http://localhost:9200/_cat/indices
```

## Production Considerations

**⚠️ This setup is for development/demo purposes. For production:**

1. **Security**
   - Change all default passwords
   - Use secrets management (e.g., Vault, AWS Secrets Manager)
   - Enable TLS/SSL for all connections
   - Implement proper authentication for all services

2. **Scalability**
   - Use managed services (RDS, ElastiCache, etc.)
   - Implement horizontal scaling for services
   - Use container orchestration (Kubernetes)
   - Add load balancers

3. **Reliability**
   - Implement proper health checks
   - Add circuit breakers and retries
   - Set up alerting (PagerDuty, Slack, etc.)
   - Configure backups for databases

4. **Observability**
   - Increase retention periods
   - Add custom dashboards
   - Set up alerting rules in Prometheus
   - Configure log aggregation and analysis

5. **Performance**
   - Tune database connection pools
   - Optimize RabbitMQ queue settings
   - Configure caching layers (Redis)
   - Profile and optimize service performance

## Architecture Diagram

```
┌─────────────┐
│   Gateway   │ :8080
└──────┬──────┘
       │
       ├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
       │          │          │          │          │          │          │
   ┌───▼───┐  ┌──▼──┐  ┌────▼────┐ ┌──▼───┐ ┌───▼────┐ ┌───▼───┐  ┌──▼──┐
   │ Auth  │  │Camp-│  │ Pledge  │ │Payment│ │Totals  │ │ Chat  │  │Admin│
   │Service│  │aign │  │ Service │ │Service│ │Service │ │Service│  │ UI  │
   └───┬───┘  └──┬──┘  └────┬────┘ └──┬───┘ └───┬────┘ └───┬───┘  └─────┘
       │         │          │          │         │          │
       └─────────┴──────────┴──────────┴─────────┴──────────┘
                           │          │
                    ┌──────┴──┐    ┌──┴────┐
                    │Postgres │    │RabbitMQ│
                    └─────────┘    └────────┘

Observability:
┌──────────────┐    ┌─────────┐    ┌───────────┐
│OpenTelemetry │───▶│ Jaeger  │    │Prometheus │
│  Collector   │    │(Traces) │    │ (Metrics) │
└──────────────┘    └─────────┘    └─────┬─────┘
                                          │
┌──────────┐    ┌──────────┐    ┌────────▼─────┐
│ Filebeat │───▶│ Logstash │───▶│Elasticsearch │
└──────────┘    └──────────┘    └────────┬─────┘
                                         │
                                    ┌────▼────┐
                                    │ Kibana  │
                                    └─────────┘
                                         │
                                    ┌────▼────┐
                                    │ Grafana │
                                    └─────────┘
```

## Next Steps

1. Implement database schemas (Prisma/Drizzle)
2. Add database migrations
3. Implement business logic in services
4. Wire up RabbitMQ event publishers and consumers
5. Add integration tests
6. Create custom Grafana dashboards
7. Set up CI/CD pipeline
8. Deploy to staging/production environment

