# Donation Service

Donation service for the CareForAll platform with checkout flow and bank balance verification.

## Features

- ✅ Donation creation with checkout flow
- ✅ Mock bank balance verification
- ✅ Support for registered users and guest donations
- ✅ Anonymous donations
- ✅ State machine for donation lifecycle
- ✅ Transactional Outbox pattern for event publishing
- ✅ MongoDB transactions for data consistency
- ✅ RabbitMQ event publishing
- ✅ OpenAPI documentation with Scalar UI
- ✅ Comprehensive unit and integration tests

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: MongoDB with Mongoose
- **Message Broker**: RabbitMQ
- **Validation**: Zod
- **Documentation**: OpenAPI 3.1 with Scalar
- **Testing**: Bun test

## Architecture

### Donation State Machine

```
PENDING → BALANCE_CHECK → AUTHORIZED → CAPTURED → COMPLETED
                        ↓
                     FAILED (insufficient balance)
```

### Checkout Flow

1. User initiates donation
2. System creates donation in PENDING state
3. System checks bank balance (mock)
4. If sufficient: Authorize → Capture → Complete
5. If insufficient: Mark as FAILED
6. Publish events to RabbitMQ via Outbox

### Database Schema

#### Donations Collection

- `campaignId` - Campaign receiving the donation
- `donorId` - User ID (optional for guests)
- `donorName` - Donor display name
- `donorEmail` - Email (for guest donations)
- `amount` - Donation amount in cents
- `status` - Current state in state machine
- `isAnonymous` - Whether donation is anonymous
- `isGuest` - Whether donor is guest or registered
- `bankAccountId` - Mock bank account identifier
- `failureReason` - Reason if failed
- `refundReason` - Reason if refunded
- `createdAt`, `updatedAt` - Timestamps
- `authorizedAt`, `capturedAt`, `completedAt`, `failedAt`, `refundedAt` - State timestamps

#### Outbox Collection

- `eventId` - Unique event identifier
- `eventType` - Type of event
- `routingKey` - RabbitMQ routing key
- `payload` - Event payload
- `status` - PENDING/PUBLISHED/FAILED
- `retryCount` - Number of retry attempts
- `maxRetries` - Maximum retries allowed
- `lastError` - Last error message
- `publishedAt` - When published

## API Endpoints

### Donations

#### POST /api/donations

Create a new donation (checkout).

**Request Body**:

```json
{
  "campaignId": "campaign_123",
  "amount": 10000,
  "donorName": "John Doe",
  "donorEmail": "john@example.com",
  "isAnonymous": false,
  "bankAccountId": "bank_acc_001"
}
```

**Response** (201):

```json
{
  "success": true,
  "data": {
    "id": "donation_id",
    "campaignId": "campaign_123",
    "amount": 10000,
    "status": "COMPLETED",
    "isGuest": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error** (400 - Insufficient Balance):

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance. Current: 0, Required: 10000"
  }
}
```

#### GET /api/donations/{id}

Get donation by ID.

#### GET /api/donations

List donations with filters and pagination.

**Query Parameters**:

- `campaignId` - Filter by campaign
- `status` - Filter by status
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

#### GET /api/donations/campaign/{campaignId}

Get all donations for a campaign.

#### GET /api/donations/me

Get all donations for authenticated user (requires auth).

#### POST /api/donations/{id}/refund

Refund a donation (admin only, requires auth).

**Request Body**:

```json
{
  "reason": "Duplicate payment"
}
```

### System

#### GET /health

Health check endpoint.

## Events

### Published Events

The service publishes these events to RabbitMQ:

1. **donation.created** - When donation is successfully completed
2. **donation.completed** - When donation reaches COMPLETED state
3. **donation.failed** - When donation fails (e.g., insufficient balance)
4. **donation.refunded** - When donation is refunded

All events are published via the Transactional Outbox pattern.

## Mock Bank Service

The service includes a mock bank service for demonstration purposes.

### Pre-configured Accounts

- `bank_acc_001` - $1000.00
- `bank_acc_002` - $500.00
- `bank_acc_003` - $100.00
- `bank_acc_004` - $50.00
- `bank_acc_005` - $10.00
- `bank_acc_006` - $1.00
- `bank_acc_007` - $0.00 (insufficient)
- `bank_acc_guest` - $1000.00 (default for guests)

### Balance Operations

- **Check Balance**: Verify if account has sufficient funds
- **Deduct Balance**: Deduct funds from account
- **Refund Balance**: Return funds to account

## Local Development

### Prerequisites

- Bun installed
- MongoDB running on `localhost:27017`
- RabbitMQ running on `localhost:5672`

### Environment Variables

```bash
DATABASE_URL=mongodb://localhost:27017/donation-service
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=care-for-all
PORT=3003
NODE_ENV=development
JWT_SECRET=your-secret-key
CAMPAIGN_SERVICE_URL=http://localhost:3002
```

### Installation

```bash
cd apps/backend/donation-service
bun install
```

### Running the Service

```bash
# Development mode with auto-reload
bun run dev

# Production mode
bun run start

# Local with environment variables
bun run dev:local
```

### Running the Worker

```bash
# Development mode
bun run dev:worker

# Production mode
bun run start:worker
```

### Running Tests

```bash
# All tests
bun test

# Specific test file
bun test tests/bank-mock.test.ts

# Local testing with test database
bun run test:local
```

### Building

```bash
# Build API and worker
bun run build

# Build only worker
bun run build:worker
```

## API Documentation

Interactive API documentation is available at:

- **Scalar UI**: http://localhost:3003/docs
- **OpenAPI Spec**: http://localhost:3003/openapi

## Authentication

The service supports both authenticated and guest donations:

### Authenticated Users

Include JWT token in Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Guest Donations

No authentication required. Simply provide `donorName` and `donorEmail` in the request.

## Testing with cURL

### Create Donation (Guest)

```bash
curl -X POST http://localhost:3003/api/donations \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign_123",
    "amount": 10000,
    "donorName": "John Doe",
    "donorEmail": "john@example.com",
    "bankAccountId": "bank_acc_001"
  }'
```

### Create Donation (Insufficient Balance)

```bash
curl -X POST http://localhost:3003/api/donations \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign_123",
    "amount": 10000,
    "donorName": "Jane Doe",
    "donorEmail": "jane@example.com",
    "bankAccountId": "bank_acc_007"
  }'
```

### Get Donation

```bash
curl http://localhost:3003/api/donations/{donation_id}
```

### List Donations

```bash
curl "http://localhost:3003/api/donations?campaignId=campaign_123&page=1&limit=20"
```

## Troubleshooting

### MongoDB Connection Issues

Ensure MongoDB is running:

```bash
mongod --dbpath=/path/to/data
```

For transactions support, MongoDB must run as a replica set:

```bash
mongod --replSet rs0 --dbpath=/path/to/data
```

Then initialize the replica set:

```bash
mongosh
> rs.initiate()
```

### RabbitMQ Connection Issues

Ensure RabbitMQ is running:

```bash
# Check status
rabbitmqctl status

# Start service
rabbitmq-server
```

## Production Deployment

### Environment Variables

Set these environment variables in production:

- `DATABASE_URL` - MongoDB connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - Strong secret for JWT verification
- `CAMPAIGN_SERVICE_URL` - Campaign service URL
- `NODE_ENV=production`

### Docker

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY . .

RUN bun run build

EXPOSE 3003

CMD ["bun", "dist/index.js"]
```

## Architecture Notes

### Transactional Outbox Pattern

The service uses the Transactional Outbox pattern to ensure reliable event publishing:

1. Donations and events are written to database in a single transaction
2. Worker polls the Outbox table for PENDING events
3. Worker publishes events to RabbitMQ
4. On success, events are marked as PUBLISHED
5. On failure, events are retried up to max attempts
6. Failed events are marked for manual intervention

### State Machine Validation

Donations follow a strict state machine with validated transitions:

- PENDING can transition to BALANCE_CHECK or FAILED
- BALANCE_CHECK can transition to AUTHORIZED or FAILED
- AUTHORIZED can transition to CAPTURED or FAILED
- CAPTURED can transition to COMPLETED or FAILED
- COMPLETED can transition to REFUNDED
- FAILED and REFUNDED are terminal states

Invalid transitions throw errors and are rejected.

## Future Enhancements

- [ ] Real payment gateway integration (Stripe, PayPal)
- [ ] Webhook handling from payment providers
- [ ] Scheduled donations (recurring)
- [ ] Donation receipts via email
- [ ] Tax receipts for donations above threshold
- [ ] Donation matching/amplification campaigns
- [ ] Real-time donation notifications
- [ ] Analytics and reporting dashboard

## License

Proprietary - CareForAll Platform

