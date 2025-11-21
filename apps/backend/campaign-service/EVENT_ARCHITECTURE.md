# Event-Driven Architecture

This document describes the event-driven architecture of the Campaign Service, including event types, flows, and handling strategies.

## Overview

The Campaign Service uses an event-driven architecture with the **Transactional Outbox Pattern** to:

1. **Publish** campaign lifecycle events for other services
2. **Consume** donation events to update campaign totals
3. **Ensure** atomicity through database transactions
4. **Guarantee** event delivery through the Outbox pattern
5. **Maintain** idempotency through event logging

## Message Broker

- **Technology**: RabbitMQ
- **Exchange**: `care-for-all` (topic exchange)
- **Exchange Type**: Topic (allows routing key patterns)

## Event Types

### Published Events

The Campaign Service publishes these events to RabbitMQ:

#### 1. campaign.created

Published when a new campaign is created.

**Routing Key**: `campaign.created`

**Payload**:
```typescript
{
  campaignId: string;
  title: string;
  description: string;
  goalAmount: number;
  ownerId: string;
  startDate: string;      // ISO 8601
  endDate: string;        // ISO 8601
  category?: string;
}
```

**Example**:
```json
{
  "eventId": "evt_1234567890_abc123",
  "eventType": "campaign.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0",
  "payload": {
    "campaignId": "65abc123...",
    "title": "Medical Support for John",
    "description": "Help John recover from surgery",
    "goalAmount": 50000,
    "ownerId": "user_123",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.000Z",
    "category": "Medical"
  }
}
```

**Consumers**: Notification Service, Analytics Service, Search Service

#### 2. campaign.updated

Published when campaign details are updated.

**Routing Key**: `campaign.updated`

**Payload**:
```typescript
{
  campaignId: string;
  updates: {
    title?: string;
    description?: string;
    goalAmount?: number;
    endDate?: string;
    category?: string;
    imageUrl?: string;
  };
}
```

**Consumers**: Search Service, Analytics Service

#### 3. campaign.status_changed

Published when campaign status changes.

**Routing Key**: `campaign.status_changed`

**Payload**:
```typescript
{
  campaignId: string;
  oldStatus: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  newStatus: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  changedBy: string;      // User ID
}
```

**Consumers**: Notification Service, Analytics Service

### Consumed Events

The Campaign Service consumes these events from RabbitMQ:

#### 1. donation.created

Consumed when a new donation is created (increments campaign total).

**Routing Key**: `donation.created`

**Payload**:
```typescript
{
  donationId: string;
  campaignId: string;
  amount: number;
  donorId?: string;
  donorName?: string;
  isAnonymous: boolean;
  timestamp: string;
}
```

**Action**: Increment `campaign.currentAmount` by `amount`

#### 2. donation.completed

Consumed when donation payment is completed.

**Routing Key**: `donation.completed`

**Payload**:
```typescript
{
  donationId: string;
  campaignId: string;
  amount: number;
  paymentId: string;
  timestamp: string;
}
```

**Action**: Log event (amount already counted in donation.created)

#### 3. donation.refunded

Consumed when a donation is refunded (decrements campaign total).

**Routing Key**: `donation.refunded`

**Payload**:
```typescript
{
  donationId: string;
  campaignId: string;
  amount: number;
  reason: string;
  timestamp: string;
}
```

**Action**: Decrement `campaign.currentAmount` by `amount`

## Event Flow Diagrams

### Campaign Creation Flow

```
User → POST /campaigns
  ↓
Campaign Service (API)
  ↓
1. Create campaign in MongoDB
2. Publish campaign.created event
  ↓
RabbitMQ (campaign.created)
  ↓
[Notification Service, Analytics Service, Search Service]
```

### Donation Event Flow (with Transactional Outbox)

```
Donation Service
  ↓
Publish donation.created event
  ↓
RabbitMQ (donation.created)
  ↓
Campaign Service (Worker)
  ↓
[START TRANSACTION]
1. Check idempotency (EventLog)
2. Update campaign.currentAmount
3. Write acknowledgment event to Outbox
4. Mark incoming event as processed
[COMMIT TRANSACTION]
  ↓
Outbox Publisher (polls every 1s)
  ↓
Read PENDING events from Outbox
  ↓
Publish to RabbitMQ
  ↓
Mark as PUBLISHED in Outbox
```

### Refund Event Flow

```
Payment Service
  ↓
Publish donation.refunded event
  ↓
RabbitMQ (donation.refunded)
  ↓
Campaign Service (Worker)
  ↓
1. Check idempotency (EventLog)
2. Decrement campaign.currentAmount
3. Mark event as processed
```

## Idempotency Strategy

To prevent duplicate event processing, the Campaign Service uses an `EventLog` collection:

### EventLog Schema

```typescript
{
  eventId: string;        // Unique event identifier
  eventType: string;      // Event type (e.g., "donation.created")
  payload: object;        // Event payload
  status: 'PROCESSED' | 'FAILED' | 'RETRYING';
  retryCount: number;     // Number of retry attempts
  lastError?: string;     // Last error message
  processedAt?: Date;     // When successfully processed
  createdAt: Date;
  updatedAt: Date;
}
```

### Idempotency Check Flow

```
1. Receive event with eventId
2. Check if EventLog exists with eventId
3. If exists and status = PROCESSED:
   - Skip processing (already handled)
   - Acknowledge message
4. If not exists:
   - Process event
   - Create EventLog entry
   - Acknowledge message
```

## Transactional Outbox Pattern

### What is the Outbox Pattern?

The Transactional Outbox pattern solves the problem of reliably publishing events when updating data. It ensures atomicity by:

1. **Writing to the database and Outbox in the same transaction**
2. **Polling the Outbox** for PENDING events
3. **Publishing to RabbitMQ** from the Outbox
4. **Marking as PUBLISHED** after successful publishing

This prevents the scenario where:
- ❌ Database update succeeds but event publish fails
- ✅ With Outbox: Both succeed together or both fail together

### Outbox Schema

```typescript
{
  eventId: string;        // Unique event identifier
  eventType: string;      // e.g., 'campaign.donation_received'
  payload: object;        // Event data
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retryCount: number;     // Number of publish attempts
  lastError?: string;     // Last error message
  publishedAt?: Date;     // When successfully published
  createdAt: Date;
  updatedAt: Date;
}
```

### Outbox Publisher

The Outbox Publisher is a background process that:

- **Polls** the Outbox every 1 second (configurable)
- **Fetches** PENDING events (oldest first, batch size: 10)
- **Publishes** to RabbitMQ
- **Updates** status to PUBLISHED on success
- **Retries** up to 5 times on failure
- **Marks** as FAILED after max retries

**Configuration**:
```env
OUTBOX_POLL_INTERVAL=1000  # Poll every 1 second
OUTBOX_MAX_RETRIES=5       # Max retry attempts
OUTBOX_BATCH_SIZE=10       # Events per batch
```

### Transaction Flow

```typescript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Update campaign total
  await Campaign.findByIdAndUpdate(
    campaignId,
    { $inc: { currentAmount: amount } },
    { session }
  );
  
  // 2. Write to Outbox
  await Outbox.create([{
    eventId,
    eventType,
    payload,
    status: 'PENDING'
  }], { session });
  
  // 3. Mark event as processed
  await EventLog.create([{
    eventId,
    status: 'PROCESSED'
  }], { session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

### Retry Strategy

- **Max Retries**: 5 attempts (configurable)
- **Retry Behavior**: Outbox Publisher retries failed publishes
- **Failed Events**: Marked as FAILED after max retries
- **Manual Recovery**: Admins can reset FAILED events to PENDING

### Monitoring Outbox

**Get Statistics**:
```typescript
const stats = await OutboxPublisherService.getStatistics();
// Returns: { pending, published, failed, total }
```

**Retry Failed Event**:
```typescript
const success = await OutboxPublisherService.retryFailedEvent(eventId);
// Resets FAILED event to PENDING for retry
```

### Benefits Over DLQ

| Feature | Outbox Pattern | DLQ Pattern |
|---------|---------------|-------------|
| Atomicity | ✅ Guaranteed | ❌ Not guaranteed |
| Lost Events | ✅ Impossible | ⚠️ Possible |
| Event Audit | ✅ In database | ⚠️ Scattered |
| Manual Retry | ✅ Easy | ⚠️ Complex |
| Transaction Safety | ✅ Full | ❌ None |

## Event Publishing

### EventService

The `EventService` handles event publishing with retry logic:

```typescript
EventService.publishEvent(
  routingKey: string,
  payload: object,
  retries: number = 3
): Promise<boolean>
```

### Publishing Flow

```
1. Generate unique eventId
2. Create event envelope:
   {
     eventId,
     eventType: routingKey,
     timestamp: ISO 8601,
     version: "1.0",
     payload
   }
3. Attempt to publish to RabbitMQ
4. If fails:
   - Wait with exponential backoff
   - Retry up to max attempts
5. Return success/failure
```

### Error Handling

- **Connection Errors**: Retry with backoff
- **Publish Failures**: Retry with backoff
- **Max Retries Exceeded**: Log error, return false

## Queue Configuration

### Main Queue

```
Name: campaign-service.donation-events
Durable: true
Bindings:
  - donation.created
  - donation.completed
  - donation.refunded
Prefetch: 10 (process 10 messages concurrently)
```

### Dead Letter Queue

```
Name: campaign-service.donation-events-dlq
Durable: true
Bindings:
  - # (all messages from main queue)
Prefetch: 1 (process one at a time)
```

## Monitoring and Observability

### Metrics to Monitor

1. **Event Processing**:
   - Events processed per second
   - Processing duration
   - Success/failure rate

2. **Queue Health**:
   - Queue depth (messages waiting)
   - Consumer count
   - Message age

3. **DLQ**:
   - DLQ message count
   - DLQ growth rate
   - Time in DLQ

### Logging

All event processing is logged with:

- `eventId`: Unique event identifier
- `eventType`: Type of event
- `campaignId`: Related campaign
- `action`: Action taken
- `duration`: Processing time
- `error`: Error details (if failed)

### Alerts

Set up alerts for:

- DLQ message count > 10
- Event processing failure rate > 5%
- Queue depth > 1000
- Worker service down

## Best Practices

1. **Always use eventId**: Ensures idempotency
2. **Include timestamp**: Helps with debugging and ordering
3. **Version events**: Allows for schema evolution
4. **Keep payloads small**: Large payloads slow down processing
5. **Monitor DLQ**: Review and reprocess failed events regularly
6. **Test failure scenarios**: Ensure retry and DLQ work correctly
7. **Use structured logging**: Makes debugging easier
8. **Set appropriate timeouts**: Prevent hanging consumers

## Testing Events

### Publishing Test Events

```bash
# Using RabbitMQ management API
curl -X POST http://localhost:15672/api/exchanges/%2F/care-for-all/publish \
  -u guest:guest \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {},
    "routing_key": "donation.created",
    "payload": "{\"eventId\":\"test_123\",\"eventType\":\"donation.created\",\"timestamp\":\"2024-01-15T10:00:00Z\",\"version\":\"1.0\",\"payload\":{\"donationId\":\"don_123\",\"campaignId\":\"camp_123\",\"amount\":100}}",
    "payload_encoding": "string"
  }'
```

### Checking Queue Status

```bash
# List queues
rabbitmqctl list_queues

# Check specific queue
rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

### Viewing DLQ Messages

```bash
# Get messages from DLQ (without removing)
rabbitmqctl list_queues name messages | grep dlq
```

## Troubleshooting

### Events Not Being Processed

1. Check worker service is running
2. Verify RabbitMQ connection
3. Check queue bindings
4. Review worker logs

### Duplicate Event Processing

1. Check EventLog for duplicate eventIds
2. Verify idempotency logic
3. Review event publishing code

### High DLQ Count

1. Review DLQ messages for patterns
2. Check for data inconsistencies
3. Fix underlying issues
4. Reprocess valid messages

### Slow Event Processing

1. Check database performance
2. Review prefetch count (may be too high/low)
3. Check for blocking operations
4. Consider scaling workers

## Future Enhancements

1. **Event Sourcing**: Store all events for audit trail
2. **CQRS**: Separate read/write models
3. **Saga Pattern**: Distributed transactions
4. **Event Replay**: Reprocess historical events
5. **Schema Registry**: Centralized event schema management
6. **Dead Letter Analysis**: Automated DLQ analysis and alerting

