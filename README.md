# Care For All - Microservices Donation Platform

A complete microservices-based donation platform built for hackathon demonstration, featuring full observability stack with OpenTelemetry, Prometheus, Grafana, Jaeger, and ELK.

## 🏗️ Architecture

This is a **Turborepo monorepo** with:

### Microservices (Bun + Hono + TypeScript)
- **gateway** - API Gateway for external traffic
- **auth-service** - User authentication service
- **campaign-service** - Campaign CRUD operations
- **pledge-service** - Pledge state machine
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

## 🚀 Quick Start

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
- All 7 microservices
- Admin frontend
- PostgreSQL + RabbitMQ
- Complete observability stack (11 services)

### Development Mode (Local)

To run services locally without Docker:

```bash
# Run all services in dev mode
bun run dev

# Or run specific service
cd apps/gateway
bun run dev
```

## 📊 Observability Access

Once `docker compose up` is running, access the following UIs:

| Service | URL | Description |
|---------|-----|-------------|
| **Gateway API** | http://localhost:8080 | Main API Gateway |
| **Gateway Docs** | http://localhost:8080/docs | Interactive API documentation (Scalar) |
| **Admin Frontend** | http://localhost:3002 | Admin panel |
| **Grafana** | http://localhost:3001 | Metrics dashboards (login: admin/admin) |
| **Prometheus** | http://localhost:9090 | Metrics exploration |
| **Jaeger** | http://localhost:16686 | Distributed tracing |
| **Kibana** | http://localhost:5601 | Log exploration |
| **Elasticsearch** | http://localhost:9200 | Raw log queries |
| **RabbitMQ UI** | http://localhost:15672 | Message broker UI (guest/guest) |
| **cAdvisor** | http://localhost:8080 | Container metrics |

## 🔍 Service URLs (Internal Docker Network)

```
gateway:          http://gateway:3000
auth-service:     http://auth-service:3000
campaign-service: http://campaign-service:3000
pledge-service:   http://pledge-service:3000
payment-service:  http://payment-service:3000
totals-service:   http://totals-service:3000
chat-service:     http://chat-service:3000
```

## 🏗️ Project Structure

```
care-for-all-microservice/
├── apps/
│   ├── gateway/              # API Gateway
│   ├── auth-service/         # Authentication
│   ├── campaign-service/     # Campaigns CRUD
│   ├── pledge-service/       # Pledges state machine
│   ├── payment-service/      # Payment processing
│   ├── totals-service/       # Campaign totals
│   ├── chat-service/         # Real-time chat
│   └── admin-frontend/       # Admin UI
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

## 🧪 Testing

```bash
# Run all tests
bun run test

# Test specific service
cd apps/campaign-service
bun test
```

## 🔨 Building

```bash
# Build all apps and packages
bun run build

# Build only changed packages (Turborepo cache)
bun run build --filter=...[origin/main]
```

## 🐳 Docker

```bash
# Build Docker images for all services
bun run docker

# Build only changed services
bun run docker --filter=...[origin/main]
```

## 🔄 CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) automatically:

1. **On Pull Request**: Tests and builds only changed services
2. **On Push to Main**: Runs full test suite and builds

Using Turborepo's intelligent caching and filtering:
```bash
turbo run test --filter=...[base_sha]
turbo run build --filter=...[base_sha]
```

## 🛠️ API Documentation

Each microservice exposes interactive API documentation powered by **Scalar**:

- Gateway: http://localhost:8080/docs
- Auth Service: http://auth-service:3000/docs
- Campaign Service: http://campaign-service:3000/docs
- And so on...

All endpoints are validated with **Zod schemas** and generate OpenAPI specs automatically via `@hono/zod-openapi`.

## 📝 Environment Variables

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

## 📚 Technology Stack

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

## 🎯 TODO - Business Logic Implementation

This repository provides a complete scaffold. The following business logic needs implementation:

### Database Schemas
- [ ] Create Prisma/Drizzle schemas for Campaign, Pledge, Payment, User
- [ ] Add migration scripts

### Service Logic
- [ ] **auth-service**: Implement JWT auth, user registration/login
- [ ] **campaign-service**: Full CRUD with PostgreSQL persistence
- [ ] **pledge-service**: State machine transitions (PENDING → AUTHORIZED → CAPTURED)
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

## 🤝 Contributing

This is a hackathon project. Contributions welcome!

## 📄 License

MIT

