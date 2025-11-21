# MongoDB PSS Replica Set Implementation Summary

## ✅ Implementation Complete

The Donation Service now uses a MongoDB PSS (Primary-Secondary-Secondary) replica set configuration for transaction support.

## Changes Made

### 1. Database Configuration (`src/config/database.ts`)

**Updated to support replica sets:**
- Added `loadConfig` for proper configuration management
- Added replica set connection options:
  - `readPreference: 'primary'` - Always read from primary
  - `w: 'majority'` - Write concern for majority consensus
  - `retryWrites: true` - Automatic retry for failed writes
- Enhanced health check to return detailed status
- Added `getDatabaseStatus()` function

### 2. Docker Compose Configuration (`infra/docker-compose.yml`)

**Added MongoDB Replica Set:**
- **mongodb-primary** (port 27017) - Primary node with priority 2
- **mongodb-secondary1** (port 27018) - Secondary node with priority 1
- **mongodb-secondary2** (port 27019) - Secondary node with priority 1
- **mongodb-init** - Initialization service (runs once)

**Updated Donation Service:**
- Changed `DATABASE_URL` to use replica set connection string:
  ```
  mongodb://mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/donation-service?replicaSet=rs0
  ```
- Added proper dependencies on MongoDB nodes with health checks

**Updated Volumes:**
- Added separate volumes for each MongoDB node:
  - `mongodb-primary-data` and `mongodb-primary-config`
  - `mongodb-secondary1-data` and `mongodb-secondary1-config`
  - `mongodb-secondary2-data` and `mongodb-secondary2-config`

### 3. Health Check Route (`src/routes/health.ts`)

**Updated to use new health check format:**
- Changed from boolean to object return type
- Now returns detailed health information

## Replica Set Architecture

```
┌─────────────────────┐
│   Primary Node      │  Priority: 2
│  mongodb-primary    │  Port: 27017
│  (Writes/Reads)     │
└──────────┬──────────┘
           │
      ┌────┴────┐
      │         │
┌─────▼────┐ ┌─▼──────────┐
│Secondary1│ │ Secondary2 │  Priority: 1 each
│   :27018 │ │   :27019   │  (Read Replicas)
└──────────┘ └────────────┘
```

## Connection String Format

```
mongodb://[primary]:[port],[secondary1]:[port],[secondary2]:[port]/[database]?replicaSet=[name]
```

**Example:**
```
mongodb://mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/donation-service?replicaSet=rs0
```

## Why Replica Set is Required

The Donation Service uses MongoDB transactions in:

1. **Checkout Service** - Atomic donation and payment processing
2. **Event Service** - Transactional Outbox pattern

**MongoDB transactions require a replica set** - they cannot work with standalone instances.

## Starting the Services

### Full Stack
```bash
cd infra
docker-compose up -d
```

### MongoDB Replica Set Only
```bash
cd infra
docker-compose up -d mongodb-primary mongodb-secondary1 mongodb-secondary2
docker-compose up mongodb-init  # Initialize replica set
```

### Donation Service
```bash
cd infra
docker-compose up -d donation-service
```

## Verification

### Check Replica Set Status
```bash
docker exec -it mongodb-primary mongosh --eval "rs.status()"
```

Expected:
- 1 PRIMARY (mongodb-primary)
- 2 SECONDARY (mongodb-secondary1, mongodb-secondary2)

### Test Donation Service Connection
```bash
docker exec -it donation-service curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "donation-service",
  "database": "connected"
}
```

## Benefits

1. ✅ **Transaction Support** - Enables MongoDB transactions
2. ✅ **High Availability** - Automatic failover if primary fails
3. ✅ **Data Redundancy** - Data replicated to 2 secondary nodes
4. ✅ **Read Scalability** - Can read from secondaries (if configured)
5. ✅ **Write Durability** - Majority write concern ensures data safety

## Troubleshooting

### Replica Set Not Initialized
```bash
docker exec -it mongodb-primary mongosh --eval "rs.status()"
```

If error, manually initialize:
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

### Connection Issues
1. Verify all MongoDB containers are running: `docker-compose ps`
2. Check connection string includes `replicaSet=rs0`
3. Verify all nodes are on same Docker network

## Files Modified

1. ✅ `apps/backend/donation-service/src/config/database.ts`
2. ✅ `apps/backend/donation-service/src/routes/health.ts`
3. ✅ `infra/docker-compose.yml`
4. ✅ `apps/backend/donation-service/MONGODB_REPLICA_SET.md` (documentation)

## Next Steps

1. **Test transactions** - Verify checkout and event publishing work correctly
2. **Monitor replica set** - Set up monitoring for replica set health
3. **Backup strategy** - Implement regular backups of primary node
4. **Production hardening** - Add authentication and network security

## References

- [MongoDB Replica Set Documentation](https://www.mongodb.com/docs/manual/replication/)
- [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- [Mongoose Connection Options](https://mongoosejs.com/docs/connections.html#options)

