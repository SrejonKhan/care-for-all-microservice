# Environment Configuration Guide

This guide explains how to set up environment variables for all backend microservices.

## Overview

Each microservice has its own:
- **Separate MongoDB database** (different database names, same MongoDB instance)
- **Unique port** for service isolation
- **Environment variables** stored in `.env` or `.env.local` files

## Quick Setup

### 1. Copy Environment Templates

Each service has an `env.template` file. Copy it to `.env.local`:

```bash
# Auth Service
cd apps/backend/auth-service
cp env.template .env.local

# Campaign Service
cd apps/backend/campaign-service
cp env.template .env.local

# Donation Service
cd apps/backend/donation-service
cp env.template .env.local

# Payment Service
cd apps/backend/payment-service
cp env.template .env.local

# Gateway
cd apps/backend/gateway
cp env.template .env.local
```

### 2. Update Values

Edit each `.env.local` file with your specific configuration.

## Service Configuration

### Auth Service

**Port**: 3000  
**Database**: `auth-service`  
**Worker**: ❌ No worker needed

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/auth-service
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
```

**Run Commands**:
```bash
bun run dev:local           # API server with .env.local
```

---

### Campaign Service

**Port**: 3002  
**Database**: `campaign-service`  
**Worker**: ✅ Campaign Worker (consumes donation events)

```env
NODE_ENV=development
PORT=3002
DATABASE_URL=mongodb://localhost:27017/campaign-service
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=care-for-all
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

**Run Commands**:
```bash
bun run dev:local                    # API server
bun run dev:campaign-worker:local    # Campaign worker
```

---

### Donation Service

**Port**: 3003  
**Database**: `donation-service`  
**Worker**: ✅ Donation Worker (publishes events via Outbox)

```env
NODE_ENV=development
PORT=3003
DATABASE_URL=mongodb://localhost:27017/donation-service
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=care-for-all
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

**Run Commands**:
```bash
bun run dev:local                    # API server
bun run dev:donation-worker:local    # Donation worker
```

---

### Payment Service

**Port**: 3004  
**Database**: `payment-service` (Replica Set)  
**Worker**: ✅ Payment Worker (publishes events via Outbox)

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

**Note**: Payment Service requires MongoDB Replica Set for transactions.

**Run Commands**:
```bash
bun run dev:local                   # API server
bun run dev:payment-worker:local    # Payment worker
```

---

### API Gateway

**Port**: 3001  
**Database**: ❌ No database  
**Worker**: ❌ No worker

```env
NODE_ENV=development
PORT=3001
AUTH_SERVICE_URL=http://localhost:3000
CAMPAIGN_SERVICE_URL=http://localhost:3002
DONATION_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004
```

**Run Commands**:
```bash
bun run dev:local    # Gateway server
```

---

## Database Configuration

### MongoDB Instance

All services use the **same MongoDB instance** but **different databases**:

```
MongoDB Instance: localhost:27017
├── auth-service          (Port 3000)
├── campaign-service      (Port 3002)
├── donation-service      (Port 3003)
└── payment-service       (Port 3004) [Replica Set]
```

### Starting MongoDB

**For Most Services** (standalone):
```bash
mongod --dbpath=/path/to/data
```

**For Payment Service** (replica set required):
```bash
# Start with replica set
mongod --replSet rs0 --dbpath=/path/to/data

# Initialize replica set (first time only)
mongosh
> rs.initiate()
```

## Workers Summary

| Service | Worker Name | Purpose | Command |
|---------|-------------|---------|---------|
| Auth Service | ❌ None | No event consumption | - |
| Campaign Service | ✅ Campaign Worker | Consume donation events | `dev:campaign-worker:local` |
| Donation Service | ✅ Donation Worker | Publish via Outbox | `dev:donation-worker:local` |
| Payment Service | ✅ Payment Worker | Publish via Outbox | `dev:payment-worker:local` |

## Running All Services Locally

### Prerequisites

1. **MongoDB** running on `localhost:27017`
2. **RabbitMQ** running on `localhost:5672`

### Start Services

```bash
# Terminal 1: Auth Service
cd apps/backend/auth-service
bun run dev:local

# Terminal 2: Campaign Service API
cd apps/backend/campaign-service
bun run dev:local

# Terminal 3: Campaign Worker
cd apps/backend/campaign-service
bun run dev:campaign-worker:local

# Terminal 4: Donation Service API
cd apps/backend/donation-service
bun run dev:local

# Terminal 5: Donation Worker
cd apps/backend/donation-service
bun run dev:donation-worker:local

# Terminal 6: Payment Service API (when implemented)
cd apps/backend/payment-service
bun run dev:local

# Terminal 7: Payment Worker (when implemented)
cd apps/backend/payment-service
bun run dev:payment-worker:local

# Terminal 8: API Gateway
cd apps/backend/gateway
bun run dev:local
```

## Environment Variables Reference

### Common Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Service port | Service-specific |
| `DATABASE_URL` | MongoDB connection string | Service-specific |
| `JWT_SECRET` | Secret for JWT signing | **Must change in production** |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |

### Service-Specific Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `RABBITMQ_URL` | Campaign, Donation, Payment | RabbitMQ connection |
| `RABBITMQ_EXCHANGE` | Campaign, Donation, Payment | RabbitMQ exchange name |
| `JWT_ACCESS_TOKEN_EXPIRY` | Auth | Access token TTL |
| `JWT_REFRESH_TOKEN_EXPIRY` | Auth | Refresh token TTL |
| `STRIPE_SECRET_KEY` | Payment | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Payment | Stripe webhook secret |
| `AUTH_SERVICE_URL` | All services | Auth service endpoint |
| `CAMPAIGN_SERVICE_URL` | Donation, Payment | Campaign service endpoint |

## Security Notes

### Production Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use environment-specific MongoDB URIs
- [ ] Enable SSL/TLS for MongoDB connections
- [ ] Use secure RabbitMQ credentials
- [ ] Store real Stripe/PayPal credentials securely
- [ ] Enable OpenTelemetry tracing
- [ ] Set `NODE_ENV=production`
- [ ] Use proper CORS origins
- [ ] Never commit `.env` or `.env.local` files

### .gitignore

Ensure these patterns are in your `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
.env.development
.env.production
```

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Check replica set status (for payment service)
mongosh --eval "rs.status()"
```

### RabbitMQ Connection Issues

```bash
# Check if RabbitMQ is running
rabbitmqctl status

# Check queues
rabbitmqctl list_queues
```

### Port Conflicts

If ports are already in use, update the `PORT` variable in `.env.local`:

```env
# Example: Change auth service to port 4000
PORT=4000
```

### Worker Not Processing Events

1. Check RabbitMQ connection in worker logs
2. Verify MongoDB connection
3. Check Outbox table for PENDING events:
   ```bash
   mongosh donation-service
   > db.outboxes.find({ status: "PENDING" })
   ```

## Docker Compose Configuration

When using Docker Compose, environment variables are managed differently:

```yaml
services:
  auth-service:
    environment:
      DATABASE_URL: mongodb://mongo:27017/auth-service
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3000
```

See `docker-compose.yml` for full configuration.

## Next Steps

1. Copy `env.template` to `.env.local` for each service
2. Update values specific to your environment
3. Start MongoDB and RabbitMQ
4. Run services with `dev:local` commands
5. Access services at their respective ports
6. Check logs for any configuration issues

## Support

For issues or questions about environment configuration:
- Check service logs for detailed error messages
- Verify all required services (MongoDB, RabbitMQ) are running
- Ensure ports are not conflicting
- Review this guide for correct configuration

