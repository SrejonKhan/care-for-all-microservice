# Architecture Documentation

## Overview

Care For All is a microservices-based donation platform built for scalability, observability, and maintainability. The system follows event-driven architecture patterns with full distributed tracing, logging, and metrics.

## Core Principles

1. **Microservices Architecture** - Each service owns its domain and data
2. **Event-Driven Communication** - Services communicate via RabbitMQ events
3. **API Gateway Pattern** - Single entry point for external clients
4. **CQRS Pattern** - Separate read and write models (totals-service)
5. **Full Observability** - Traces, metrics, and logs for all services

## Technology Stack

### Runtime & Framework
- **Bun** - Fast JavaScript runtime with built-in bundler
- **Hono** - Lightweight web framework
- **TypeScript** - Type-safe development

### API & Validation
- **Zod** - Schema validation
- **OpenAPI** - API specification
- **Scalar** - Interactive API documentation

### Data Layer
- **PostgreSQL** - Primary relational database
- **RabbitMQ** - Message broker for async communication

### Observability
- **OpenTelemetry** - Distributed tracing and metrics
- **Jaeger** - Trace visualization
- **Prometheus** - Metrics collection
- **Grafana** - Dashboards and visualization
- **Elasticsearch** - Log storage
- **Logstash** - Log processing
- **Kibana** - Log exploration
- **Filebeat** - Log shipping
- **cAdvisor** - Container metrics
- **Node Exporter** - Host metrics

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Local orchestration
- **Turborepo** - Monorepo build system
- **GitHub Actions** - CI/CD

## Service Architecture

### 1. Gateway Service
**Purpose**: API Gateway and routing

**Responsibilities**:
- Route external requests to internal services
- Aggregate service documentation
- Handle CORS and security headers
- Rate limiting (future)
- Authentication verification (delegates to auth-service)

**Technology**: Hono with proxy middleware

**Endpoints**:
- `/api/auth/*` → auth-service
- `/api/campaigns/*` → campaign-service
- `/api/pledges/*` → pledge-service
- `/api/payments/*` → payment-service
- `/api/totals/*` → totals-service
- `/api/chat/*` → chat-service

### 2. Auth Service
**Purpose**: Authentication and authorization

**Responsibilities**:
- User registration and login
- JWT token generation and validation
- Password hashing and verification
- Session management

**Technology**: Hono + Zod validation

**Events Published**: None currently

**Events Consumed**: None currently

**TODO**:
- Implement JWT generation with expiration
- Add refresh token support
- Implement password reset flow
- Add OAuth2 providers (Google, GitHub)

### 3. Campaign Service
**Purpose**: Campaign management (CRUD)

**Responsibilities**:
- Create, read, update, delete campaigns
- Campaign state management (DRAFT, ACTIVE, PAUSED, COMPLETED)
- Owner authorization
- Goal tracking

**Technology**: Hono + Zod validation

**Events Published**:
- `campaign.created`
- `campaign.updated`
- `campaign.completed`

**Events Consumed**: None

**Database Schema** (TODO):
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  goal_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  owner_id UUID NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Pledge Service
**Purpose**: Pledge state machine

**Responsibilities**:
- Create pledges for campaigns
- Manage pledge state transitions
- Validate state machine rules
- Coordinate with payment service

**Technology**: Hono + Zod validation

**State Machine**:
```
PENDING → AUTHORIZED → CAPTURED
          ↓               ↓
        FAILED        REFUNDED
```

**State Transition Rules**:
- PENDING → AUTHORIZED: Payment authorized by payment service
- AUTHORIZED → CAPTURED: Payment captured successfully
- AUTHORIZED → FAILED: Payment authorization failed
- CAPTURED → REFUNDED: Payment refunded
- PENDING → FAILED: Initial authorization failed

**Events Published**:
- `pledge.created`
- `pledge.state_changed`

**Events Consumed**:
- `payment.authorized`
- `payment.captured`
- `payment.failed`
- `payment.refunded`

**Database Schema** (TODO):
```sql
CREATE TABLE pledges (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  user_id UUID NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  state VARCHAR(20) NOT NULL,
  payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Payment Service
**Purpose**: Payment processing and webhook handling

**Responsibilities**:
- Authorize payments with payment providers (Stripe, PayPal)
- Capture authorized payments
- Handle payment webhooks
- Implement idempotency for payment operations
- Refund processing

**Technology**: Hono + Zod validation

**Idempotency**:
- Each payment request requires an idempotency key
- Duplicate requests with same key return same result
- Keys stored in database with TTL

**Events Published**:
- `payment.authorized`
- `payment.captured`
- `payment.failed`
- `payment.refunded`

**Events Consumed**:
- `pledge.created` (triggers payment authorization)

**Database Schema** (TODO):
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  pledge_id UUID NOT NULL REFERENCES pledges(id),
  amount DECIMAL(12,2) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_transaction_id VARCHAR(255),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_idempotency ON payments(idempotency_key);
```

### 6. Totals Service
**Purpose**: Materialized read model for campaign totals

**Responsibilities**:
- Maintain real-time campaign totals
- Provide fast read access to aggregate data
- Update totals based on payment events

**Technology**: Hono + RabbitMQ consumer

**Events Published**: None

**Events Consumed**:
- `payment.captured` (increment total)
- `payment.refunded` (decrement total)

**Database Schema** (TODO):
```sql
CREATE TABLE campaign_totals (
  campaign_id UUID PRIMARY KEY REFERENCES campaigns(id),
  total_amount DECIMAL(12,2) DEFAULT 0,
  total_pledges INTEGER DEFAULT 0,
  total_donors INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

**CQRS Pattern**:
- Write Model: pledge-service, payment-service
- Read Model: totals-service (this service)
- Eventually consistent

### 7. Chat Service
**Purpose**: Real-time chat for campaigns

**Responsibilities**:
- WebSocket connections for real-time messaging
- Message broadcasting to campaign rooms
- Message persistence (TODO)
- User presence tracking (TODO)

**Technology**: Hono + Bun WebSocket

**WebSocket Protocol**:
```typescript
// Client → Server
{
  userId: string;
  userName: string;
  message: string;
}

// Server → Client
{
  type: 'message' | 'system';
  id: string;
  campaignId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}
```

**Events Published**:
- `chat.message` (for persistence/analytics)

**Events Consumed**: None

### 8. Admin Frontend
**Purpose**: Admin panel for platform management

**Technology**: Vite + React + TypeScript

**Current State**: Placeholder UI with service status

**TODO**:
- Campaign management interface
- User management
- Payment tracking
- Analytics dashboards
- Real-time chat interface

## Communication Patterns

### Synchronous (HTTP)
- Client → Gateway → Services
- Used for: CRUD operations, queries, immediate responses

### Asynchronous (Events via RabbitMQ)
- Service → RabbitMQ → Service(s)
- Used for: State changes, notifications, eventual consistency

### Event Flow Example: Creating a Pledge

```
1. User → Gateway → Pledge Service
   POST /api/pledges
   { campaignId, amount }

2. Pledge Service:
   - Validates campaign exists
   - Creates pledge with state=PENDING
   - Stores in database
   - Publishes pledge.created event
   - Returns pledge to user

3. Payment Service (consumes pledge.created):
   - Authorizes payment with provider
   - If success: Publishes payment.authorized
   - If failure: Publishes payment.failed

4. Pledge Service (consumes payment.authorized):
   - Updates pledge state to AUTHORIZED
   - Publishes pledge.state_changed event

5. Payment Service (manual capture or automatic):
   - Captures the authorized payment
   - Publishes payment.captured

6. Pledge Service (consumes payment.captured):
   - Updates pledge state to CAPTURED
   - Publishes pledge.state_changed event

7. Totals Service (consumes payment.captured):
   - Increments campaign total
   - Updates donor count
   - Updates pledge count
```

## Data Flow

### Write Path
```
Client → Gateway → Service → Database → Event → Other Services
```

### Read Path
```
Client → Gateway → Service → Database → Response
```

### CQRS Path
```
Write: Client → Gateway → Service → Database → Event
Read:  Client → Gateway → Totals Service → Materialized View → Response
```

## Security Architecture

### External Security
- Gateway handles CORS
- Rate limiting (TODO)
- Input validation via Zod schemas
- SQL injection prevention via parameterized queries
- XSS prevention via proper escaping

### Internal Security
- Service-to-service authentication via `INTERNAL_SERVICE_SECRET`
- JWT tokens for user authentication
- Environment-based secrets
- Database connection encryption (TODO)

### Secrets Management
- Environment variables (development)
- TODO: Vault or AWS Secrets Manager (production)

## Observability Architecture

### Distributed Tracing
```
Client Request → Gateway (trace starts)
  → Auth Service (span)
  → Campaign Service (span)
    → Database (span)
    → RabbitMQ (span)
      → Totals Service (new span, linked by trace_id)
```

**Implementation**:
- OpenTelemetry SDK in each service
- Automatic instrumentation via `@opentelemetry/auto-instrumentations-node`
- OTLP export to OpenTelemetry Collector
- Collector exports to Jaeger

**Trace Context Propagation**:
- W3C Trace Context headers
- Automatic propagation via OpenTelemetry

### Metrics Collection

**Service Metrics** (via OpenTelemetry):
- Request count
- Request duration
- Error rate
- Database query duration
- RabbitMQ message count

**Infrastructure Metrics**:
- Container metrics (cAdvisor)
- Host metrics (Node Exporter)
- PostgreSQL metrics (TODO)
- RabbitMQ metrics (built-in)

**Collection Flow**:
```
Service → OpenTelemetry SDK → OTLP Exporter → OTel Collector → Prometheus
Container → cAdvisor → Prometheus
Host → Node Exporter → Prometheus
```

### Logging Architecture

**Log Format**:
```json
{
  "level": "info|error|warn|debug",
  "message": "Log message",
  "serviceName": "campaign-service",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "traceId": "abc123...",
  "spanId": "def456...",
  "userId": "user_123",
  "requestId": "req_789"
}
```

**Log Flow**:
```
Service → stdout (JSON) → Docker logs → Filebeat → Logstash → Elasticsearch → Kibana/Grafana
```

**Log Correlation**:
- Logs include `traceId` for correlation with traces
- Search logs by trace ID in Kibana
- Click trace ID in Grafana to view related logs

### Dashboards

**Grafana Dashboards** (TODO):
1. Service Overview
   - Request rate
   - Error rate
   - Response time (p50, p95, p99)
   - Service health

2. Infrastructure Overview
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network I/O

3. Business Metrics
   - Campaigns created
   - Pledges created
   - Total donations
   - Active users

4. Database Metrics
   - Query performance
   - Connection pool usage
   - Slow queries

## Scalability Considerations

### Horizontal Scaling
- All services are stateless (except chat-service)
- Can run multiple instances behind load balancer
- Database connection pooling

### Vertical Scaling
- Increase container resources
- Tune JVM/Node.js heap sizes
- Database query optimization

### Database Scaling
- Read replicas for read-heavy operations
- Partitioning for large tables
- Indexing strategy

### Message Queue Scaling
- RabbitMQ clustering (TODO)
- Multiple consumers per queue
- Priority queues for critical events

## Deployment Architecture

### Development
- Docker Compose with all services
- Local volumes for data persistence
- Hot reload for code changes

### Production (TODO)
- Kubernetes cluster
- Helm charts for deployment
- Managed database (RDS, CloudSQL)
- Managed message queue (CloudAMQP, Amazon MQ)
- CDN for static assets
- Auto-scaling based on metrics

## Future Improvements

1. **Resilience**
   - Circuit breakers (Hystrix, resilience4j)
   - Retry with exponential backoff
   - Bulkheads
   - Timeouts

2. **Caching**
   - Redis for session storage
   - Cache campaign data
   - Cache user data

3. **Search**
   - Elasticsearch for campaign search
   - Full-text search
   - Faceted search

4. **Analytics**
   - Real-time dashboards
   - Donation trends
   - User behavior tracking

5. **Notifications**
   - Email notifications
   - Push notifications
   - SMS notifications

6. **Admin Features**
   - User management
   - Campaign moderation
   - Fraud detection
   - Analytics dashboard

## References

- [Microservices Patterns](https://microservices.io/patterns/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Hono Documentation](https://hono.dev/)
- [RabbitMQ Patterns](https://www.rabbitmq.com/tutorials)

