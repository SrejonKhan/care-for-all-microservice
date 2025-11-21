# Local Testing Guide

This guide provides instructions for testing the Campaign Service locally without Docker.

## Prerequisites

- Bun installed
- MongoDB running locally (port 27017)
- RabbitMQ running locally (port 5672) - optional for basic testing
- Auth Service running (port 3000) - for authentication

## Quick Start

```bash
# Start MongoDB and the service
bun run start:local

# In another terminal, run tests
bun run test:local
```

## Manual Setup

### 1. Start MongoDB

```bash
# Using MongoDB service
mongod --dbpath /path/to/data

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Start RabbitMQ (Optional)

```bash
# Using Docker
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3-management
```

### 3. Set Environment Variables

Create `.env.local`:

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/campaign-service-dev
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=care-for-all
JWT_SECRET=your-secret-key-change-in-production
AUTH_SERVICE_URL=http://localhost:3000
LOG_LEVEL=debug
```

### 4. Install Dependencies

```bash
bun install
```

### 5. Start the Service

```bash
# API Service
bun run dev:local

# Worker Service (in another terminal)
bun run dev:worker:local
```

## Testing with cURL

### 1. Get an Access Token

First, get a token from the Auth Service:

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

Save the `accessToken` from the response.

### 2. Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "campaign-service",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.45,
  "database": "connected"
}
```

### 3. Create a Campaign

```bash
export TOKEN="your_access_token_here"

curl -X POST http://localhost:3001/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Medical Support for Emergency Surgery",
    "description": "Urgent medical treatment needed for life-saving surgery. Every contribution helps save a life.",
    "goalAmount": 50000,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "category": "Medical",
    "imageUrl": "https://example.com/image.jpg"
  }'
```

Save the campaign `id` from the response.

### 4. List Campaigns

```bash
# List all campaigns
curl http://localhost:3001/campaigns

# List with pagination
curl "http://localhost:3001/campaigns?page=1&pageSize=10"

# Filter by status
curl "http://localhost:3001/campaigns?status=ACTIVE"

# Filter by owner
curl "http://localhost:3001/campaigns?ownerId=user_123"

# Combine filters
curl "http://localhost:3001/campaigns?status=ACTIVE&category=Medical&page=1&pageSize=20"
```

### 5. Get Campaign by ID

```bash
export CAMPAIGN_ID="your_campaign_id_here"

curl http://localhost:3001/campaigns/$CAMPAIGN_ID
```

### 6. Update Campaign

```bash
export TOKEN="your_access_token_here"
export CAMPAIGN_ID="your_campaign_id_here"

# Update title and goal amount
curl -X PATCH http://localhost:3001/campaigns/$CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Updated Campaign Title",
    "goalAmount": 75000
  }'

# Change status to ACTIVE
curl -X PATCH http://localhost:3001/campaigns/$CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "ACTIVE"
  }'
```

### 7. Delete Campaign

```bash
export TOKEN="your_access_token_here"
export CAMPAIGN_ID="your_campaign_id_here"

curl -X DELETE http://localhost:3001/campaigns/$CAMPAIGN_ID \
  -H "Authorization: Bearer $TOKEN"
```

## Testing Event Processing

### Simulate Donation Event

To test the worker's donation event processing:

```bash
# Publish a donation.created event to RabbitMQ
curl -X POST http://localhost:15672/api/exchanges/%2F/care-for-all/publish \
  -u guest:guest \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {},
    "routing_key": "donation.created",
    "payload": "{\"eventId\":\"evt_test_123\",\"eventType\":\"donation.created\",\"timestamp\":\"2024-01-15T10:00:00Z\",\"version\":\"1.0\",\"payload\":{\"donationId\":\"don_123\",\"campaignId\":\"YOUR_CAMPAIGN_ID\",\"amount\":500,\"donorId\":\"donor_123\",\"donorName\":\"John Doe\",\"isAnonymous\":false,\"timestamp\":\"2024-01-15T10:00:00Z\"}}",
    "payload_encoding": "string"
  }'
```

Replace `YOUR_CAMPAIGN_ID` with an actual campaign ID.

Check the campaign's `currentAmount` should increase by 500:

```bash
curl http://localhost:3001/campaigns/YOUR_CAMPAIGN_ID
```

### Simulate Refund Event

```bash
curl -X POST http://localhost:15672/api/exchanges/%2F/care-for-all/publish \
  -u guest:guest \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {},
    "routing_key": "donation.refunded",
    "payload": "{\"eventId\":\"evt_test_456\",\"eventType\":\"donation.refunded\",\"timestamp\":\"2024-01-15T11:00:00Z\",\"version\":\"1.0\",\"payload\":{\"donationId\":\"don_123\",\"campaignId\":\"YOUR_CAMPAIGN_ID\",\"amount\":200,\"reason\":\"Customer request\",\"timestamp\":\"2024-01-15T11:00:00Z\"}}",
    "payload_encoding": "string"
  }'
```

## Testing with Postman

### Import Collection

1. Open Postman
2. Click "Import"
3. Select "Link" tab
4. Enter: `http://localhost:3001/openapi`
5. Click "Continue" and "Import"

### Set Environment Variables

Create a Postman environment with:

- `baseUrl`: `http://localhost:3001`
- `authUrl`: `http://localhost:3000`
- `accessToken`: (will be set after login)

### Authentication Flow

1. **Register/Login** (Auth Service):
   - POST `{{authUrl}}/auth/login`
   - Save `accessToken` to environment

2. **Use Token**:
   - Set Authorization header: `Bearer {{accessToken}}`

## Automated Testing

### Run Unit Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/campaign.service.test.ts

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

### Run Integration Tests

```bash
# Ensure MongoDB is running
# Ensure the service is running on port 3001

bun test tests/api.test.ts
```

## Common Test Scenarios

### Scenario 1: Complete Campaign Lifecycle

```bash
# 1. Create campaign
CAMPAIGN_RESPONSE=$(curl -s -X POST http://localhost:3001/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Campaign",
    "description": "Test description",
    "goalAmount": 10000,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z"
  }')

CAMPAIGN_ID=$(echo $CAMPAIGN_RESPONSE | jq -r '.data.id')
echo "Created campaign: $CAMPAIGN_ID"

# 2. Update to ACTIVE
curl -X PATCH http://localhost:3001/campaigns/$CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "ACTIVE"}'

# 3. Simulate donation
# (Use RabbitMQ publish command from above)

# 4. Check updated amount
curl http://localhost:3001/campaigns/$CAMPAIGN_ID

# 5. Complete campaign
curl -X PATCH http://localhost:3001/campaigns/$CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "COMPLETED"}'
```

### Scenario 2: Test Pagination

```bash
# Create multiple campaigns
for i in {1..15}; do
  curl -X POST http://localhost:3001/campaigns \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"title\": \"Campaign $i\",
      \"description\": \"Description for campaign $i\",
      \"goalAmount\": $((i * 1000)),
      \"startDate\": \"2024-01-01T00:00:00Z\",
      \"endDate\": \"2024-12-31T23:59:59Z\"
    }"
done

# Test pagination
curl "http://localhost:3001/campaigns?page=1&pageSize=5"
curl "http://localhost:3001/campaigns?page=2&pageSize=5"
curl "http://localhost:3001/campaigns?page=3&pageSize=5"
```

### Scenario 3: Test Ownership

```bash
# User 1 creates campaign
USER1_TOKEN="token_for_user_1"
CAMPAIGN_ID=$(curl -s -X POST http://localhost:3001/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{
    "title": "User 1 Campaign",
    "description": "Test",
    "goalAmount": 5000,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z"
  }' | jq -r '.data.id')

# User 2 tries to update (should fail with 403)
USER2_TOKEN="token_for_user_2"
curl -X PATCH http://localhost:3001/campaigns/$CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -d '{"title": "Hacked!"}'

# Should return 403 Forbidden
```

## Monitoring

### Check Logs

```bash
# API service logs
tail -f logs/campaign-service.log

# Worker service logs
tail -f logs/campaign-worker.log
```

### Check MongoDB

```bash
# Connect to MongoDB
mongosh

# Use database
use campaign-service-dev

# Check campaigns
db.campaigns.find().pretty()

# Check event logs
db.eventlogs.find().pretty()

# Count campaigns by status
db.campaigns.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

### Check RabbitMQ

```bash
# List queues
rabbitmqctl list_queues

# Check specific queue
rabbitmqctl list_queues name messages_ready messages_unacknowledged

# Management UI
# Open http://localhost:15672
# Login: guest / guest
```

## Troubleshooting

### Service Won't Start

```bash
# Check if port is in use
lsof -i :3001

# Check MongoDB connection
mongosh mongodb://localhost:27017/campaign-service-dev

# Check environment variables
cat .env.local
```

### Authentication Errors

```bash
# Verify Auth Service is running
curl http://localhost:3000/health

# Check JWT secret matches
echo $JWT_SECRET

# Get a fresh token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

### Events Not Processing

```bash
# Check worker is running
ps aux | grep worker

# Check RabbitMQ connection
rabbitmqctl status

# Check queue bindings
rabbitmqctl list_bindings

# Check worker logs
tail -f logs/campaign-worker.log
```

### Database Issues

```bash
# Check MongoDB is running
mongosh

# Check collections
use campaign-service-dev
show collections

# Check indexes
db.campaigns.getIndexes()
```

## Cleanup

```bash
# Stop services
# Press Ctrl+C in terminal running the service

# Clear database
mongosh campaign-service-dev --eval "db.dropDatabase()"

# Clear RabbitMQ queues
rabbitmqctl purge_queue campaign-service.donation-events
rabbitmqctl purge_queue campaign-service.donation-events-dlq

# Remove Docker containers (if used)
docker stop mongodb rabbitmq
docker rm mongodb rabbitmq
```

## Next Steps

- Review [README.md](./README.md) for architecture overview
- Check [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) for API documentation
- Read [EVENT_ARCHITECTURE.md](./EVENT_ARCHITECTURE.md) for event details
- Run automated tests with `bun test`

