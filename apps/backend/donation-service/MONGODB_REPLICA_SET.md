# MongoDB Replica Set Configuration for Donation Service

## Overview

The Donation Service uses MongoDB transactions for the Transactional Outbox pattern, which requires a MongoDB replica set. This document describes the PSS (Primary-Secondary-Secondary) replica set configuration.

## Architecture

### Replica Set Topology

```
┌─────────────────┐
│   Primary       │  (Priority: 2)
│  mongodb-primary│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼────┐ ┌──▼──────┐
│Secondary│ │Secondary│  (Priority: 1 each)
│   1     │ │    2    │
└─────────┘ └─────────┘
```

**Configuration:**
- **Primary**: 1 node (mongodb-primary) - Handles all writes
- **Secondary**: 2 nodes (mongodb-secondary1, mongodb-secondary2) - Replicate data
- **Replica Set Name**: `rs0`
- **Write Concern**: `majority` (w: 'majority')
- **Read Preference**: `primary`

## Docker Compose Setup

The replica set is configured in `infra/docker-compose.yml` with:

1. **Three MongoDB nodes**:
   - `mongodb-primary` (port 27017)
   - `mongodb-secondary1` (port 27018)
   - `mongodb-secondary2` (port 27019)

2. **Initialization service**:
   - `mongodb-init` - Runs once to initialize the replica set

## Connection String

The donation service uses the following connection string:

```
mongodb://mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/donation-service?replicaSet=rs0
```

**Key Parameters:**
- Multiple hosts for high availability
- `replicaSet=rs0` - Specifies the replica set name
- Database name: `donation-service`

## Database Configuration

The donation service database configuration (`src/config/database.ts`) includes:

```typescript
await mongoose.connect(dbUrl, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  // Replica set specific options
  readPreference: 'primary',
  w: 'majority',
  retryWrites: true,
});
```

**Options Explained:**
- `readPreference: 'primary'` - Always read from primary
- `w: 'majority'` - Write concern: wait for majority of nodes
- `retryWrites: true` - Retry failed writes automatically

## Why Replica Set is Required

The Donation Service uses MongoDB transactions in:

1. **Checkout Service** (`src/services/checkout.service.ts`):
   - Atomic donation creation and payment processing
   - Bank balance verification within transactions

2. **Event Service** (`src/services/event.service.ts`):
   - Transactional Outbox pattern
   - Atomic writes to Outbox within transactions

**MongoDB transactions require a replica set** - they cannot work with standalone MongoDB instances.

## Starting the Replica Set

### Using Docker Compose

```bash
cd infra
docker-compose up -d mongodb-primary mongodb-secondary1 mongodb-secondary2
docker-compose up mongodb-init  # Initialize replica set
docker-compose up -d donation-service  # Start donation service
```

### Manual Initialization (if needed)

If the automatic initialization fails, you can manually initialize:

```bash
docker exec -it mongodb-primary mongosh --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongodb-primary:27017', priority: 2 },
    { _id: 1, host: 'mongodb-secondary1:27017', priority: 1 },
    { _id: 2, host: 'mongodb-secondary2:27017', priority: 1 }
  ]
})
"
```

## Verifying Replica Set Status

### Check Replica Set Status

```bash
docker exec -it mongodb-primary mongosh --eval "rs.status()"
```

Expected output:
- 1 PRIMARY node (mongodb-primary)
- 2 SECONDARY nodes (mongodb-secondary1, mongodb-secondary2)

### Check Connection from Donation Service

```bash
docker exec -it donation-service mongosh "mongodb://mongodb-primary:27017/donation-service?replicaSet=rs0" --eval "rs.status()"
```

## Benefits of PSS Replica Set

1. **High Availability**: If primary fails, one secondary can be elected as new primary
2. **Data Redundancy**: Data replicated to 2 secondary nodes
3. **Transaction Support**: Enables MongoDB transactions (required for Outbox pattern)
4. **Read Scalability**: Can read from secondaries (if configured)
5. **Automatic Failover**: Automatic primary election on failure

## Troubleshooting

### Issue: "Transaction numbers are only allowed on a replica set"

**Solution**: Ensure replica set is initialized:
```bash
docker exec -it mongodb-primary mongosh --eval "rs.status()"
```

### Issue: Replica set not initializing

**Solution**: 
1. Check all MongoDB containers are healthy:
   ```bash
   docker-compose ps
   ```
2. Manually initialize (see above)
3. Check logs:
   ```bash
   docker-compose logs mongodb-primary
   ```

### Issue: Connection timeout

**Solution**: 
1. Verify all nodes are on the same Docker network
2. Check connection string includes all nodes
3. Ensure `replicaSet=rs0` is in connection string

## Production Considerations

For production environments:

1. **Use proper authentication**: Add MongoDB authentication
2. **Separate networks**: Use internal networks for MongoDB nodes
3. **Persistent volumes**: Ensure data volumes are backed up
4. **Monitoring**: Monitor replica set health and lag
5. **Backup strategy**: Regular backups of primary node
6. **Resource limits**: Set appropriate CPU/memory limits

## Environment Variables

The donation service uses:

```env
DATABASE_URL=mongodb://mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/donation-service?replicaSet=rs0
```

For local development (single node replica set):
```env
DATABASE_URL=mongodb://localhost:27017/donation-service?replicaSet=rs0
```

## References

- [MongoDB Replica Set Documentation](https://www.mongodb.com/docs/manual/replication/)
- [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- [Mongoose Connection Options](https://mongoosejs.com/docs/connections.html#options)

