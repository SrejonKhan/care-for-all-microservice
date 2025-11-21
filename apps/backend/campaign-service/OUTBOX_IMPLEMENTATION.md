# Transactional Outbox Pattern Implementation

## Overview

The Campaign Service has been successfully migrated from the Dead Letter Queue (DLQ) pattern to the **Transactional Outbox Pattern**. This ensures atomicity and prevents lost events when updating campaign totals from donation events.

## What Changed

### Before (DLQ Pattern)
```
Donation Event → Update Campaign → Publish Event (can fail ❌)
                                 ↓
                            Retry 3x → DLQ
```

**Problems**:
- Campaign update could succeed but event publish could fail
- Lost events if process crashes between update and publish
- No atomicity guarantee

### After (Transactional Outbox Pattern)
```
Donation Event → [Transaction: Update Campaign + Write to Outbox] → Commit ✅
                                                                  ↓
                 Outbox Publisher (polls 1s) → Publish → Mark PUBLISHED
```

**Benefits**:
- ✅ **Atomicity**: Both succeed or both fail together
- ✅ **No Lost Events**: Events persisted before publishing
- ✅ **Audit Trail**: All events stored in database
- ✅ **Manual Recovery**: Failed events can be retried

## Implementation Details

### 1. Outbox Model

**File**: `src/models/outbox.model.ts`

**Schema**:
```typescript
{
  eventId: string;          // Unique identifier
  eventType: string;        // e.g., 'campaign.donation_received'
  payload: object;          // Event data
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retryCount: number;       // Publish retry attempts
  lastError?: string;       // Last error message
  publishedAt?: Date;       // When published
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `eventId` (unique)
- `status, createdAt` (for polling)
- `status, retryCount` (for querying)

### 2. Outbox Publisher Service

**File**: `src/services/outbox-publisher.service.ts`

**Features**:
- Polls Outbox every 1 second (configurable)
- Processes up to 10 events per poll (configurable)
- Retries failed publishes up to 5 times (configurable)
- Marks events as FAILED after max retries
- Supports manual retry of failed events

**Configuration** (environment variables):
```env
OUTBOX_POLL_INTERVAL=1000  # Poll interval in ms
OUTBOX_MAX_RETRIES=5       # Max retry attempts
OUTBOX_BATCH_SIZE=10       # Events per batch
```

### 3. Donation Event Handler with Transactions

**File**: `src/services/donation-event-handler.service.ts`

**Transaction Flow**:
```typescript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Update campaign amount
  await Campaign.findByIdAndUpdate(
    campaignId,
    { $inc: { currentAmount: amount } },
    { session }
  );
  
  // 2. Write to Outbox
  await Outbox.create([{
    eventId,
    eventType: 'campaign.donation_received',
    payload,
    status: 'PENDING'
  }], { session });
  
  // 3. Mark incoming event as processed
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

### 4. Worker Integration

**File**: `src/worker.ts`

The worker now:
1. Consumes donation events from RabbitMQ
2. Processes them using transactional Outbox
3. Runs Outbox Publisher in background

**Startup**:
```typescript
// Start donation event consumer
await rabbitMQ.consume(QUEUES.DONATION_EVENTS, ...);

// Start Outbox publisher
outboxPublisher.start();
```

## Removed Components

### Deleted Files
- ❌ `src/workers/dlq-consumer.ts`
- ❌ `src/workers/donation-event-consumer.ts`

### Removed Configuration
- ❌ `QUEUES.DONATION_DLQ` from `src/config/rabbitmq.ts`

## Testing

### Unit Tests

**Outbox Publisher Tests** (`tests/outbox-publisher.test.ts`):
- ✅ Get Outbox statistics
- ✅ Retry failed events
- ✅ Create Outbox entries with defaults
- ✅ Enforce unique eventId
- ✅ Validate status enum

**Donation Event Handler Tests** (`tests/donation-event-handler.test.ts`):
- ✅ Increment campaign amount and create Outbox entry
- ✅ Idempotency (no duplicate processing)
- ✅ Transaction rollback on error
- ✅ Decrement amount and create Outbox entry
- ✅ Prevent negative campaign amounts

### Important Note

MongoDB transactions require a **replica set**. For testing:
- Local development: Use a single-node replica set
- Production: Use proper replica set configuration

**Setup Local Replica Set**:
```bash
# Start MongoDB as replica set
mongod --replSet rs0

# Initialize replica set
mongosh
> rs.initiate()
```

## API for Monitoring

### Get Outbox Statistics

```typescript
const stats = await OutboxPublisherService.getStatistics();
console.log(stats);
// {
//   pending: 5,
//   published: 1234,
//   failed: 2,
//   total: 1241
// }
```

### Retry Failed Event

```typescript
const success = await OutboxPublisherService.retryFailedEvent('evt_123');
// Resets status from FAILED to PENDING
```

## Event Types

### Published via Outbox

When donations are processed, these events are written to the Outbox:

1. **campaign.donation_received**
   ```typescript
   {
     campaignId: string;
     donationId: string;
     amount: number;
     donorId?: string;
     timestamp: string;
   }
   ```

2. **campaign.donation_refunded**
   ```typescript
   {
     campaignId: string;
     donationId: string;
     amount: number;
     reason: string;
     timestamp: string;
   }
   ```

## Monitoring Best Practices

### Metrics to Track

1. **Outbox Health**:
   - Number of PENDING events (should be low)
   - Number of FAILED events (should be zero)
   - Age of oldest PENDING event (should be < 5 seconds)

2. **Publisher Performance**:
   - Events processed per poll
   - Publishing success rate
   - Average time from PENDING to PUBLISHED

3. **Alerts to Set Up**:
   - FAILED events > 5
   - PENDING events > 100
   - Oldest PENDING event > 30 seconds
   - Publisher not running

### Debugging Failed Events

```javascript
// Query failed events
const failedEvents = await Outbox.find({ status: 'FAILED' })
  .sort({ updatedAt: -1 })
  .limit(10);

failedEvents.forEach(event => {
  console.log({
    eventId: event.eventId,
    eventType: event.eventType,
    retryCount: event.retryCount,
    lastError: event.lastError,
    payload: event.payload
  });
});
```

## Migration Notes

### No Database Migration Required

- Existing `EventLog` collection remains unchanged
- `Campaign` collection structure unchanged
- New `Outbox` collection created automatically
- Can deploy with zero downtime

### Compatibility

- Backward compatible with existing donation events
- No changes required to other services
- RabbitMQ queues remain the same (except DLQ removal)

## Performance Considerations

### Database Load

- Outbox polling adds minimal load (1 query per second)
- Batch processing limits concurrent operations
- Indexes optimize query performance

### RabbitMQ Load

- Publishing moved from inline to batch
- Smoother load distribution
- Better handling of temporary RabbitMQ outages

### Transaction Overhead

- MongoDB transactions add ~2-5ms overhead
- Acceptable trade-off for atomicity guarantee
- Scales well with proper replica set configuration

## Production Checklist

Before deploying to production:

- [ ] MongoDB replica set configured
- [ ] Outbox indexes created
- [ ] Environment variables configured
- [ ] Monitoring alerts set up
- [ ] Failed event recovery process documented
- [ ] Team trained on Outbox pattern
- [ ] Load testing completed
- [ ] Rollback plan prepared

## Troubleshooting

### Issue: Outbox Growing Too Large

**Solution**:
- Increase `OUTBOX_BATCH_SIZE`
- Decrease `OUTBOX_POLL_INTERVAL`
- Check RabbitMQ connectivity
- Review failed events

### Issue: Events Stuck in PENDING

**Solution**:
- Check Outbox Publisher is running
- Verify RabbitMQ connection
- Check worker logs for errors
- Restart worker if needed

### Issue: High FAILED Event Count

**Solution**:
- Review `lastError` field in Outbox
- Fix underlying issue (network, RabbitMQ, etc.)
- Manually retry events using `retryFailedEvent()`

## Conclusion

The Transactional Outbox pattern provides a robust, production-ready solution for reliable event publishing. It solves the fundamental problem of atomicity that plagued the DLQ approach, ensuring zero event loss and consistent state across the system.

---

**Implementation Date**: January 2025  
**Pattern**: Transactional Outbox  
**Status**: ✅ Complete and Ready for Production

