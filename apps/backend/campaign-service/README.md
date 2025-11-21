# Campaign Service

The Campaign Service is a core microservice in the CareForAll donation platform. It manages medical fundraising campaigns, handles campaign lifecycle events, and maintains campaign totals through event-driven architecture.

## Features

- **Campaign Management**: Create, read, update, and delete campaigns
- **Role-Based Access Control**: Automatic elevation to CAMPAIGN_OWNER role on first campaign creation
- **Transactional Outbox Pattern**: Guarantees atomic event publishing with zero event loss
- **Event-Driven Architecture**: Reliable event publishing via Outbox and RabbitMQ
- **Idempotent Event Processing**: Prevents duplicate event processing using event logs
- **Real-time Campaign Totals**: Updates campaign amounts transactionally from donation events
- **MongoDB Storage**: Flexible document storage with Mongoose ODM
- **OpenAPI/Swagger Documentation**: Interactive API documentation with Scalar UI
- **Comprehensive Testing**: Unit and integration tests

## Architecture

### Components

1. **API Service** (`src/index.ts`): REST API for campaign management
2. **Worker Service** (`src/worker.ts`): Event consumer for donation events
3. **Database**: MongoDB for campaigns and event logs
4. **Message Broker**: RabbitMQ for event-driven communication

### Event Flow with Transactional Outbox

```
Campaign Created → Write to Outbox → Outbox Publisher → RabbitMQ → Other Services
Donation Created → RabbitMQ → Worker → [Transaction: Update Campaign + Write Outbox] → Commit
Donation Refunded → RabbitMQ → Worker → [Transaction: Update Campaign + Write Outbox] → Commit
```

### Transactional Outbox Pattern

- **Atomicity**: Campaign updates and event creation in same transaction
- **Reliability**: Outbox Publisher polls every 1 second and publishes events
- **Retry Logic**: Failed publishes retry up to 5 times
- **Zero Event Loss**: Events persisted in database before publishing
- **Manual Recovery**: Failed events can be manually retried

For detailed information, see [OUTBOX_IMPLEMENTATION.md](./OUTBOX_IMPLEMENTATION.md)

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono with OpenAPI support
- **Database**: MongoDB with Mongoose
- **Message Broker**: RabbitMQ (amqplib)
- **Validation**: Zod
- **Authentication**: JWT (shared with Auth Service)
- **Documentation**: Scalar API Reference
- **Testing**: Bun test runner

## Prerequisites

- Bun >= 1.0.0
- MongoDB >= 6.0
- RabbitMQ >= 3.12 (for event-driven features)
- Auth Service running (for authentication)

## Installation

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
```

## Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/campaign-service

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=care-for-all

# Auth
JWT_SECRET=your-secret-key-change-in-production
AUTH_SERVICE_URL=http://localhost:3000

# Logging
LOG_LEVEL=info

# Outbox Configuration
OUTBOX_POLL_INTERVAL=1000  # Poll interval in ms
OUTBOX_MAX_RETRIES=5       # Max retry attempts
OUTBOX_BATCH_SIZE=10       # Events per batch

# OpenTelemetry (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_TRACES_ENABLED=true
```

## Running the Service

### Development

```bash
# Run API service with hot reload
bun run dev

# Run worker service with hot reload
bun run dev:worker

# Run both locally (with MongoDB)
bun run start:local
```

### Production

```bash
# Build the service
bun run build

# Run API service
bun run start

# Run worker service
bun run start:worker
```

### Docker

```bash
# Build Docker image
docker build -t campaign-service .

# Run with Docker Compose
docker-compose up campaign-service campaign-worker
```

## API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /campaigns` - List campaigns (with filters and pagination)
- `GET /campaigns/:id` - Get campaign by ID
- `GET /docs` - Swagger UI
- `GET /openapi` - OpenAPI specification

### Protected Endpoints (Require Authentication)

- `POST /campaigns` - Create a new campaign
- `PATCH /campaigns/:id` - Update campaign (owner or admin only)
- `DELETE /campaigns/:id` - Delete campaign (owner or admin only)

## API Documentation

Interactive API documentation is available at:

- **Development**: http://localhost:3001/docs
- **OpenAPI Spec**: http://localhost:3001/openapi

See [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) for detailed usage instructions.

## Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/campaign.service.test.ts

# Run tests with coverage
bun test --coverage

# Test locally with scripts
bun run test:local
```

See [LOCAL_TESTING.md](./LOCAL_TESTING.md) for manual testing instructions.

## Event Types

### Published Events

- `campaign.created` - New campaign created
- `campaign.updated` - Campaign details updated
- `campaign.status_changed` - Campaign status changed

### Consumed Events

- `donation.created` - New donation (increment campaign total)
- `donation.completed` - Donation payment completed
- `donation.refunded` - Donation refunded (decrement campaign total)

See [EVENT_ARCHITECTURE.md](./EVENT_ARCHITECTURE.md) for detailed event documentation.

## Database Schema

### Campaign Collection

```typescript
{
  _id: ObjectId,
  title: string,
  description: string,
  goalAmount: number,
  currentAmount: number,
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED',
  ownerId: string,
  startDate: Date,
  endDate: Date,
  category?: string,
  imageUrl?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### EventLog Collection

```typescript
{
  _id: ObjectId,
  eventId: string (unique),
  eventType: string,
  payload: object,
  status: 'PROCESSED' | 'FAILED' | 'RETRYING',
  retryCount: number,
  lastError?: string,
  processedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Project Structure

```
campaign-service/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts
│   │   └── rabbitmq.ts
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts
│   │   ├── rbac.ts
│   │   └── ownership.ts
│   ├── models/          # Mongoose models
│   │   ├── campaign.model.ts
│   │   ├── event-log.model.ts
│   │   └── index.ts
│   ├── routes/          # API routes
│   │   ├── campaigns.ts
│   │   └── health.ts
│   ├── schemas/         # Zod validation schemas
│   │   └── campaign.schema.ts
│   ├── services/        # Business logic
│   │   ├── campaign.service.ts
│   │   ├── event.service.ts
│   │   ├── donation-event-handler.service.ts
│   │   └── auth-client.service.ts
│   ├── types/           # TypeScript types
│   │   ├── campaign.types.ts
│   │   └── events.types.ts
│   ├── workers/         # Event consumers
│   │   ├── donation-event-consumer.ts
│   │   └── dlq-consumer.ts
│   ├── index.ts         # API service entry point
│   └── worker.ts        # Worker service entry point
├── tests/               # Test files
│   ├── campaign.service.test.ts
│   ├── donation-event-handler.test.ts
│   └── api.test.ts
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB is running
mongosh

# Check connection string
echo $MONGODB_URI
```

### RabbitMQ Connection Issues

```bash
# Check RabbitMQ is running
rabbitmqctl status

# Check queues
rabbitmqctl list_queues
```

### Authentication Issues

- Ensure Auth Service is running
- Verify JWT_SECRET matches Auth Service
- Check token expiration

### Event Processing Issues

- Check worker logs for errors
- Review DLQ messages: `rabbitmqctl list_queues | grep dlq`
- Check EventLog collection for failed events

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation
4. Ensure all tests pass before committing

## License

Proprietary - CareForAll Platform

## Support

For issues and questions, contact the backend team or create an issue in the repository.

