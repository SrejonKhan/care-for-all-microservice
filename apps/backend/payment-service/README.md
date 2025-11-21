# Payment Service

Production-ready Payment Service for the CareForAll donation platform with idempotency, state machine validation, webhook handling, and Transactional Outbox pattern.

## Features

✅ **State Machine**: Strict payment status transitions (PENDING → AUTHORIZED → CAPTURED → COMPLETED → REFUNDED)  
✅ **Idempotency**: Prevents duplicate charges with idempotency keys  
✅ **Webhook Handling**: Secure webhook processing with signature verification  
✅ **Transactional Outbox**: Reliable event publishing to RabbitMQ  
✅ **MongoDB Replica Set**: ACID transactions for critical operations  
✅ **Multiple Providers**: Mock, Stripe, PayPal (extensible)  
✅ **OpenAPI Documentation**: Interactive Swagger UI  
✅ **Comprehensive Testing**: Unit and integration tests  
✅ **Observability**: OpenTelemetry tracing support  

## Architecture

### Payment State Machine

```
PENDING → AUTHORIZED → CAPTURED → COMPLETED
         ↓              ↓           ↓
       FAILED ←―――――――――――――――――― REFUNDED
```

**Valid Transitions:**
- `PENDING` → `AUTHORIZED`, `FAILED`
- `AUTHORIZED` → `CAPTURED`, `FAILED`
- `CAPTURED` → `COMPLETED`, `REFUNDED`, `FAILED`
- `COMPLETED` → `REFUNDED`
- `FAILED` and `REFUNDED` are terminal states

### Idempotency Strategy

1. **API Requests**: Check idempotency key before processing
2. **Webhooks**: Check event ID to prevent duplicate processing
3. **Response Caching**: Store responses for 24 hours
4. **Duplicate Detection**: Return cached response if key exists

### Transactional Outbox

1. **Write to Database + Outbox**: Atomic transaction
2. **Worker Polls Outbox**: Every 1 second
3. **Publish to RabbitMQ**: Reliable event delivery
4. **Status Tracking**: PENDING → PUBLISHED → (delete or mark COMPLETED)
5. **Retry Logic**: Up to 5 retries, then mark as FAILED

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: MongoDB (Replica Set required)
- **Message Queue**: RabbitMQ
- **Validation**: Zod
- **Documentation**: OpenAPI 3.1 with Scalar UI
- **Testing**: Bun test
- **Observability**: OpenTelemetry

## Database Models

### Payment

```typescript
{
  paymentId: string;
  donationId: string;
  amount: number;
  provider: 'STRIPE' | 'PAYPAL' | 'MOCK';
  status: PaymentStatus;
  idempotencyKey: string;
  providerTransactionId?: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
  // State timestamps
  authorizedAt?: Date;
  capturedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
}
```

### WebhookLog

```typescript
{
  webhookId: string;
  provider: 'STRIPE' | 'PAYPAL' | 'MOCK';
  eventType: string;
  eventId: string; // Provider's unique event ID
  paymentId?: string;
  status: 'PROCESSED' | 'DUPLICATE' | 'FAILED';
  signature?: string;
  payload: Record<string, any>;
}
```

### Outbox

```typescript
{
  eventId: string;
  eventType: string;
  routingKey: string;
  payload: any;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  publishedAt?: Date;
}
```

## API Endpoints

### Payment Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/authorize` | Authorize a payment (hold funds) |
| POST | `/api/payments/{id}/capture` | Capture authorized payment (charge funds) |
| POST | `/api/payments/{id}/refund` | Refund a payment |
| GET | `/api/payments/{id}` | Get payment by ID |
| GET | `/api/payments` | List payments with filters |

### Webhook Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks` | Receive provider webhooks |

### Health & Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI documentation |
| GET | `/openapi` | OpenAPI JSON spec |

## Events Published

- `payment.authorized` - Payment authorized successfully
- `payment.captured` - Payment captured
- `payment.completed` - Payment completed
- `payment.failed` - Payment failed
- `payment.refunded` - Payment refunded

## Quick Start

### Prerequisites

1. **MongoDB Replica Set** (required for transactions):
```bash
# Start MongoDB with replica set
mongod --replSet rs0 --dbpath=/path/to/data

# Initialize replica set (first time only)
mongosh
> rs.initiate()
```

2. **RabbitMQ**:
```bash
rabbitmq-server
```

### Installation

```bash
cd apps/backend/payment-service
bun install
```

### Configuration

Copy the `.env.example` to `.env` and update:

```env
NODE_ENV=development
PORT=3004
DATABASE_URL=mongodb://localhost:27017/payment-service?replicaSet=rs0
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=care-for-all
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Payment Providers
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
```

### Run Locally

```bash
# Start API server
bun run dev

# Start worker (in another terminal)
bun run dev:payment-worker
```

### Production Build

```bash
bun run build
bun run start
bun run start:payment-worker  # In separate process
```

## Usage Examples

### 1. Authorize Payment

```bash
curl -X POST http://localhost:3004/api/payments/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "donationId": "don_123",
    "amount": 100,
    "provider": "MOCK",
    "idempotencyKey": "idem_unique_123",
    "paymentMethodId": "pm_test"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_123",
    "status": "AUTHORIZED",
    "providerTransactionId": "mock_txn_123",
    ...
  }
}
```

### 2. Capture Payment

```bash
curl -X POST http://localhost:3004/api/payments/pay_123/capture \
  -H "Content-Type: application/json"
```

### 3. Refund Payment

```bash
curl -X POST http://localhost:3004/api/payments/pay_123/refund \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer requested refund"
  }'
```

### 4. Webhook Example

```bash
curl -X POST http://localhost:3004/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "MOCK",
    "eventType": "payment.captured",
    "eventId": "evt_unique_123",
    "signature": "mock_signature",
    "data": {
      "paymentId": "pay_123",
      "status": "captured"
    }
  }'
```

## Testing

### Unit Tests

```bash
bun test
```

### Integration Tests

```bash
# Make sure MongoDB and RabbitMQ are running
bun run test:local
```

### Test Scenarios

1. **Idempotency**: Send same request twice, verify single charge
2. **Webhook Duplicate**: Send same webhook twice, verify single processing
3. **Out-of-Order Webhooks**: Send CAPTURED before AUTHORIZED, verify rejection
4. **Failed Payment**: Test with `paymentMethodId: "pm_fail"`
5. **Insufficient Funds**: Test with `paymentMethodId: "pm_insufficient_funds"`
6. **Refund Flow**: Authorize → Capture → Refund

## Mock Provider

The Mock provider supports test scenarios:

| Payment Method ID | Behavior |
|-------------------|----------|
| `pm_test` | Success |
| `pm_fail` | Authorization fails |
| `pm_insufficient_funds` | Insufficient funds error |

## Monitoring

### Outbox Stats

The worker logs Outbox statistics every minute:

```json
{
  "pending": 0,
  "published": 150,
  "failed": 2
}
```

### Health Check

```bash
curl http://localhost:3004/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "payment-service",
  "version": "1.0.0",
  "uptime": 3600,
  "database": {
    "healthy": true,
    "message": "Database is healthy"
  }
}
```

## Security

### Production Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use real Stripe/PayPal credentials
- [ ] Enable MongoDB authentication
- [ ] Use SSL/TLS for MongoDB and RabbitMQ
- [ ] Implement rate limiting
- [ ] Enable webhook signature verification
- [ ] Set up proper CORS
- [ ] Enable OpenTelemetry tracing
- [ ] Set up monitoring and alerting

### Idempotency Best Practices

1. Generate unique idempotency keys per request
2. Store idempotency keys for 24 hours
3. Return 409 Conflict for duplicate requests
4. Include idempotency key in all non-idempotent operations

### Webhook Security

1. Verify webhook signatures
2. Check event IDs for duplicates
3. Log all webhook attempts
4. Implement replay attack prevention
5. Use HTTPS in production

## Troubleshooting

### MongoDB Transaction Errors

**Error**: `Transaction numbers are only allowed on a replica set member`

**Solution**: Ensure MongoDB is running as a replica set:
```bash
mongod --replSet rs0 --dbpath=/path/to/data
mongosh
> rs.initiate()
```

### Idempotency Key Conflicts

**Error**: `Duplicate idempotency key`

**Solution**: Use unique keys per request or wait 24 hours for expiration.

### Webhook Processing Failures

Check webhook logs:
```bash
# Query WebhookLog collection
mongosh payment-service
> db.webhooklogs.find({ status: "FAILED" })
```

### Outbox Events Stuck

Check Outbox status:
```bash
mongosh payment-service
> db.outboxes.find({ status: "PENDING" })
```

Manually retry failed events (admin endpoint needed).

## File Structure

```
payment-service/
├── src/
│   ├── config/
│   │   ├── database.ts           # MongoDB with replica set
│   │   └── rabbitmq.ts           # RabbitMQ setup
│   ├── middleware/
│   │   └── auth.ts               # JWT verification
│   ├── models/
│   │   ├── payment.model.ts      # Payment schema with state machine
│   │   ├── webhook-log.model.ts  # Webhook idempotency
│   │   ├── outbox.model.ts       # Transactional outbox
│   │   └── index.ts              # Model exports
│   ├── routes/
│   │   ├── payments.ts           # Payment endpoints
│   │   ├── webhooks.ts           # Webhook endpoint
│   │   └── health.ts             # Health check
│   ├── schemas/
│   │   ├── payment.schema.ts     # Zod validation
│   │   └── webhook.schema.ts     # Webhook validation
│   ├── services/
│   │   ├── payment.service.ts            # Business logic
│   │   ├── idempotency.service.ts        # Idempotency handling
│   │   ├── payment-provider.service.ts   # Provider interface
│   │   ├── webhook.service.ts            # Webhook processing
│   │   ├── event.service.ts              # Event publishing
│   │   └── outbox-publisher.service.ts   # Outbox polling
│   ├── types/
│   │   ├── payment.types.ts      # TypeScript types
│   │   └── events.types.ts       # Event types
│   ├── index.ts                  # API entry point
│   └── worker.ts                 # Worker entry point
├── tests/
│   ├── idempotency.test.ts
│   ├── payment.service.test.ts
│   └── webhook.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

1. Follow the established patterns from Auth, Campaign, and Donation services
2. Write tests for new features
3. Update documentation
4. Run linter before committing

## License

Private - CareForAll Platform

---

**API Documentation**: http://localhost:3004/docs  
**Health Check**: http://localhost:3004/health

For issues or questions, refer to the main project documentation.

