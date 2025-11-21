# Care For All - Microservices Donation Platform

A complete microservices-based donation platform built for hackathon demonstration, featuring full observability stack with OpenTelemetry, Prometheus, Grafana, Jaeger, and ELK.

## Architecture

This is a **Turborepo monorepo** with:

### Microservices (Bun + Hono + TypeScript)

- **gateway** - API Gateway for external traffic
- **auth-service** - User authentication service
- **campaign-service** - Campaign CRUD operations
- **donation-service** - Donation state machine
- **payment-service** - Payment workflows with webhooks & idempotency
- **totals-service** - Materialized view for campaign totals
- **chat-service** - Real-time chat with WebSocket support

### Frontend

- **admin-frontend** - Admin panel (Vite + React + TypeScript)

### Shared Packages

- **shared-types** - Common TypeScript types, interfaces, and event schemas
- **shared-config** - Configuration loader and validation
- **shared-logger** - Structured JSON logging
- **shared-rabbitmq** - RabbitMQ connection and messaging helpers
- **shared-otel** - OpenTelemetry tracing initialization

### Infrastructure Stack

- **PostgreSQL** - Primary database
- **RabbitMQ** - Message broker for async communication
- **OpenTelemetry Collector** - Telemetry data pipeline
- **Jaeger** - Distributed tracing UI
- **Prometheus** - Metrics collection
- **Node Exporter** - Host metrics
- **cAdvisor** - Container metrics
- **Grafana** - Metrics visualization and dashboards
- **Elasticsearch** - Log and event storage
- **Logstash** - Log processing pipeline
- **Kibana** - Log exploration UI
- **Filebeat** - Container log shipping

## Quick Start

### Prerequisites

- **Bun** >= 1.1.0 ([Install Bun](https://bun.sh))
- **Docker** & **Docker Compose**

### Installation

1. **Clone the repository**

```bash
git clone <repo-url>
cd care-for-all-microservice
```

2. **Install dependencies**

```bash
bun install
```

3. **Start all services with Docker Compose**

```bash
cd infra
docker compose up --build
```

This single command starts:

- Nginx reverse proxy (single entry point)
- All 7 microservices
- Next.js frontend
- PostgreSQL + MongoDB + RabbitMQ
- Complete observability stack (11 services)

### Development Mode (Local)

To run services locally without Docker:

```bash
# Run all services in dev mode
bun run dev

# Or run specific service
cd apps/backend/gateway
bun run dev
```

## Observability Access

Once `docker compose up` is running, access the following UIs:

| Service           | URL                    | Description                             |
| ----------------- | ---------------------- | --------------------------------------- |
| **Application**   | http://localhost       | Main entry point (nginx)                |
| **API**           | http://localhost/api   | API Gateway (via nginx)                 |
| **API Docs**      | http://localhost/docs  | Interactive API documentation (Scalar)  |
| **Admin Panel**   | http://localhost/admin | Admin panel                             |
| **Grafana**       | http://localhost:3001  | Metrics dashboards (login: admin/admin) |
| **Prometheus**    | http://localhost:9090  | Metrics exploration                     |
| **Jaeger**        | http://localhost:16686 | Distributed tracing                     |
| **Kibana**        | http://localhost:5601  | Log exploration                         |
| **Elasticsearch** | http://localhost:9200  | Raw log queries                         |
| **RabbitMQ UI**   | http://localhost:15672 | Message broker UI (guest/guest)         |
| **cAdvisor**      | http://localhost:8080  | Container metrics                       |

## Service URLs

### Public URLs (via Nginx)

```
Application:   http://localhost       → Admin Frontend
Admin Panel:   http://localhost/admin → Admin Frontend
API:           http://localhost/api   → Gateway → Microservices
API Docs:      http://localhost/docs  → Gateway API Documentation
Health Check:  http://localhost/health → Gateway Health
```

### Internal Docker Network

```
nginx:            http://nginx:80
gateway:          http://gateway:3000
auth-service:     http://auth-service:3000
campaign-service: http://campaign-service:3000
donation-service: http://donation-service:3000
payment-service:  http://payment-service:3000
totals-service:   http://totals-service:3000
chat-service:     http://chat-service:3000
admin-frontend:   http://admin-frontend:80
```

## Project Structure

```
care-for-all-microservice/
├── apps/
│   ├── backend/              # Backend microservices
│   │   ├── gateway/          # API Gateway
│   │   ├── auth-service/     # Authentication
│   │   ├── campaign-service/ # Campaigns CRUD
│   │   ├── donation-service/ # Donations state machine
│   │   ├── payment-service/  # Payment processing
│   │   ├── totals-service/   # Campaign totals
│   │   └── chat-service/     # Real-time chat
│   └── frontend/             # Frontend applications
│       └── admin-frontend/   # Admin UI
├── packages/
│   ├── shared-types/         # Common types & schemas
│   ├── shared-config/        # Config loader
│   ├── shared-logger/        # JSON logger
│   ├── shared-rabbitmq/      # RabbitMQ helpers
│   └── shared-otel/          # OpenTelemetry setup
├── infra/
│   ├── docker-compose.yml    # All services orchestration
│   ├── prometheus.yml        # Prometheus config
│   ├── otel-collector-config.yml
│   ├── logstash.conf
│   ├── filebeat.yml
│   └── grafana/              # Grafana provisioning
├── .github/
│   └── workflows/
│       └── ci.yml            # CI with Turborepo filters
├── turbo.json                # Turborepo config
├── package.json              # Root package
└── tsconfig.base.json        # Base TypeScript config
```

## Testing

```bash
# Run all tests
bun run test

# Test specific service
cd apps/campaign-service
bun test
```

## Building

```bash
# Build all apps and packages
bun run build

# Build only changed packages (Turborepo cache)
bun run build --filter=...[origin/main]
```

## Docker

```bash
# Build Docker images for all services
bun run docker

# Build only changed services
bun run docker --filter=...[origin/main]
```

## CI/CD

### Continuous Integration (CI)

The CI pipeline (`.github/workflows/ci.yml`) automatically:

1. **Detects Changed Services**: Only tests/builds affected microservices
2. **Runs Tests**: Parallel testing for changed services
3. **Builds Services**: TypeScript compilation + Docker images
4. **Semantic Versioning**: Tags images with version from package.json
5. **Branch Protection**: CI must pass before merging

### Continuous Deployment (CD)

The CD pipeline (`.github/workflows/cd.yml`) automatically:

1. **Deploys to Digital Ocean**: After CI passes on main branch
2. **Zero-Downtime**: Rolling updates with Docker Compose
3. **Health Checks**: Verifies all services are running
4. **Rollback Support**: Manual rollback capability

### Quick Start

```bash
# CI triggers automatically on PR/push
git push origin main

# Manual deployment
# Go to Actions → CD - Continuous Deployment → Run workflow

# Version bump
# Go to Actions → Version Bump → Run workflow
```

**Full CI/CD Documentation**: See [CI_CD_SETUP.md](./CI_CD_SETUP.md)

## API Documentation

Each microservice exposes interactive API documentation powered by **Scalar**:

- Gateway: http://localhost:8080/docs
- Auth Service: http://auth-service:3000/docs
- Campaign Service: http://campaign-service:3000/docs
- And so on...

All endpoints are validated with **Zod schemas** and generate OpenAPI specs automatically via `@hono/zod-openapi`.

## Environment Variables

Each service uses environment variables for configuration. Key vars include:

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/dbname

# Message Broker
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Service URLs (for inter-service communication)
CAMPAIGN_SERVICE_URL=http://campaign-service:3000
PAYMENT_SERVICE_URL=http://payment-service:3000

# Security
INTERNAL_SERVICE_SECRET=your-secret-here
```

See individual service directories for complete `.env.example` files.

## Technology Stack

- **Runtime**: Bun 1.1+
- **Framework**: Hono 4.x
- **Validation**: Zod 3.x
- **API Docs**: Scalar + OpenAPI
- **Database**: PostgreSQL
- **Message Broker**: RabbitMQ
- **Tracing**: OpenTelemetry + Jaeger
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Container Metrics**: cAdvisor
- **Host Metrics**: Node Exporter
- **Monorepo**: Turborepo 2.x
- **CI/CD**: GitHub Actions

## TODO - Business Logic Implementation

This repository provides a complete scaffold. The following business logic needs implementation:

### Database Schemas

- [ ] Create Prisma/Drizzle schemas for Campaign, Pledge, Payment, User
- [ ] Add migration scripts

### Service Logic

- [ ] **auth-service**: Implement JWT auth, user registration/login
- [ ] **campaign-service**: Full CRUD with PostgreSQL persistence
- [ ] **donation-service**: State machine transitions (PENDING → AUTHORIZED → CAPTURED)
- [ ] **payment-service**: Payment provider integration, webhook handling, idempotency keys
- [ ] **totals-service**: Event listeners to update campaign totals
- [ ] **chat-service**: WebSocket room management, message persistence

### Event-Driven Communication

- [ ] Wire RabbitMQ event publishers in services
- [ ] Implement event consumers in relevant services
- [ ] Define exchange/queue topology

### Frontend

- [ ] Build admin UI for campaign management
- [ ] Add dashboard for monitoring pledges/payments
- [ ] Implement real-time chat interface

## Contributing

This is a hackathon project. Contributions welcome!

## Hackathon Checkpoints Status

| Checkpoint                   | Status      | Documentation                        |
| ---------------------------- | ----------- | ------------------------------------ |
| **1. Architecture & Design** | ✅ Complete | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| **2. Core Implementation**   | ✅ Complete | [README.md](./README.md) (this file) |
| **3. Observability**         | ✅ Complete | [infra/README.md](./infra/README.md) |
| **4. CI/CD Pipeline**        | ✅ Complete | [CI_CD_SETUP.md](./CI_CD_SETUP.md)   |

### Additional Documentation

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Digital Ocean deployment
- [HACKATHON_DEMO.md](./HACKATHON_DEMO.md) - Demo script for judges
- [CHECKPOINT_4_SUMMARY.md](./CHECKPOINT_4_SUMMARY.md) - CI/CD compliance
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines

## License

MIT
