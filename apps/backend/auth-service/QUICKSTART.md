# Auth Service - Quick Start Guide

Get the Auth Service up and running in 5 minutes!

## Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- PostgreSQL database running
- Node.js 18+ (for some dependencies)

## Step 1: Install Dependencies

```bash
cd apps/backend/auth-service
bun install
```

## Step 2: Configure Environment

Create a `.env` file or set environment variables:

```bash
# Required
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/care_for_all"
export JWT_SECRET="your_secret_key_change_in_production"

# Optional (with defaults)
export PORT=3000
export NODE_ENV=development
export LOG_LEVEL=info
export JWT_ACCESS_EXPIRES_IN=15m
export JWT_REFRESH_EXPIRES_IN=7d
export BCRYPT_ROUNDS=10
```

## Step 3: Setup Database

```bash
# Generate Prisma client
bun run db:generate

# Push schema to database (creates tables)
bun run db:push
```

## Step 4: Start the Service

```bash
# Development mode (with hot reload)
bun run dev

# Production mode
bun run start
```

The service will be available at `http://localhost:3000`

## Step 5: Test the API

### View API Documentation
Open `http://localhost:3000/docs` in your browser

### Register a User
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get User Profile
```bash
# Replace YOUR_ACCESS_TOKEN with the token from login response
curl -X GET http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create Guest User
```bash
curl -X POST http://localhost:3000/guest \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Guest User"
  }'
```

## Run Tests

```bash
# Make sure DATABASE_URL is set
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/care_for_all_test"

# Run all tests
bun test

# Run specific test file
bun test tests/auth.test.ts
```

## Docker Setup

### Build Image
```bash
docker build -t auth-service .
```

### Run Container
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/care_for_all" \
  -e JWT_SECRET="your_secret_key" \
  auth-service
```

## Common Issues

### Issue: "DATABASE_URL is required but not provided"
**Solution**: Make sure DATABASE_URL environment variable is set

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

### Issue: "Cannot connect to database"
**Solution**: 
1. Check if PostgreSQL is running
2. Verify connection string is correct
3. Check if database exists

```bash
# Create database if it doesn't exist
psql -U postgres -c "CREATE DATABASE care_for_all;"
```

### Issue: "Prisma Client not generated"
**Solution**: Run Prisma generate

```bash
bun run db:generate
```

### Issue: "Tables don't exist"
**Solution**: Push schema to database

```bash
bun run db:push
```

## API Endpoints Summary

### Public Endpoints
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /guest` - Create guest user
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout user
- `POST /verify-token` - Verify JWT token

### Protected Endpoints (Require Authentication)
- `GET /me` - Get current user profile
- `PATCH /me` - Update user profile
- `POST /guest/claim` - Claim guest account

### Admin Endpoints (Require ADMIN Role)
- `GET /users` - List all users
- `PATCH /users/:id/role` - Update user role
- `GET /users/stats` - Get user statistics

### Health Check
- `GET /health` - Service health status

## Next Steps

1. **Integrate with Gateway**: Configure the API gateway to route requests to this service
2. **Setup Observability**: Configure OpenTelemetry, Prometheus, and Grafana
3. **Add More Features**: Implement email verification, password reset, etc.
4. **Production Deployment**: Deploy to your production environment

## Useful Commands

```bash
# Development
bun run dev              # Start with hot reload
bun run build            # Build for production
bun run start            # Start production server

# Database
bun run db:generate      # Generate Prisma client
bun run db:push          # Push schema to database
bun run db:migrate       # Create migration
bun run db:studio        # Open Prisma Studio

# Testing
bun test                 # Run all tests
bun test --watch         # Run tests in watch mode

# Utilities
bun run clean            # Clean build artifacts
```

## Support

For more detailed information, see:
- [README.md](./README.md) - Complete documentation
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation details
- API Documentation at `/docs` when service is running

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | Secret for signing JWT tokens |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment (development/production) |
| `LOG_LEVEL` | No | info | Log level (debug/info/warn/error) |
| `JWT_ACCESS_EXPIRES_IN` | No | 15m | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | No | 7d | Refresh token expiry |
| `BCRYPT_ROUNDS` | No | 10 | bcrypt salt rounds |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | - | OpenTelemetry endpoint |

## Quick Test Script

Save this as `test-auth.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "Testing Auth Service..."

# Register
echo -e "\n1. Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }')

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.tokens.accessToken')
echo "Access Token: ${ACCESS_TOKEN:0:50}..."

# Get Profile
echo -e "\n2. Getting user profile..."
curl -s -X GET $BASE_URL/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

# Create Guest
echo -e "\n3. Creating guest user..."
curl -s -X POST $BASE_URL/guest \
  -H "Content-Type: application/json" \
  -d '{"name": "Guest User"}' | jq

echo -e "\n✅ All tests completed!"
```

Make it executable and run:
```bash
chmod +x test-auth.sh
./test-auth.sh
```

---

**Ready to go!** 🚀

The Auth Service is now running and ready to handle authentication for the CareForAll platform.

