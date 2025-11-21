# Local Testing Guide - Auth Service

This guide will help you run and test the Auth Service locally without Docker.

## 🚀 Quick Start

### Prerequisites

1. **Bun installed** (v1.0+)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **MongoDB running locally**
   ```bash
   # Option 1: Using Docker (just for MongoDB)
   docker run -d -p 27017:27017 --name mongodb-local mongo:latest
   
   # Option 2: Install MongoDB locally
   # Visit: https://www.mongodb.com/try/download/community
   ```

### Step 1: Install Dependencies

```bash
cd apps/backend/auth-service
bun install
```

### Step 2: Set Environment Variables

Create a `.env.local` file:

```bash
# Copy this to .env.local
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/care_for_all_dev
# OR
DATABASE_URL=mongodb://localhost:27017/care_for_all_dev

# JWT Configuration
JWT_SECRET=local_dev_secret_key_change_in_production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Password Hashing
BCRYPT_ROUNDS=10

# OpenTelemetry (Optional - disable for local testing)
# OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
# OTEL_TRACES_ENABLED=false
```

### Step 3: Start the Service

```bash
# Development mode with hot reload
bun run dev

# Or with environment file
bun --env-file=.env.local run dev
```

The service will start on `http://localhost:3000`

### Step 4: Access Swagger Documentation

Open your browser and navigate to:

**📚 Interactive API Documentation (Scalar UI)**
```
http://localhost:3000/docs
```

**📄 OpenAPI JSON Spec**
```
http://localhost:3000/openapi
```

## 🧪 Testing Endpoints

### Option 1: Using Swagger UI (Recommended)

1. Open `http://localhost:3000/docs`
2. Browse available endpoints
3. Click "Try it out" on any endpoint
4. Fill in the request body
5. Click "Execute"
6. View the response

### Option 2: Using cURL

#### 1. Register a New User

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "name": "Test User",
      "role": "USER",
      "isGuest": false,
      "emailVerified": false,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

#### 2. Login

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 3. Create Guest User

```bash
curl -X POST http://localhost:3000/guest \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Guest User"
  }'
```

#### 4. Get User Profile (Protected)

```bash
# Replace YOUR_ACCESS_TOKEN with the token from login/register
curl -X GET http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 5. Update Profile

```bash
curl -X PATCH http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name"
  }'
```

#### 6. Refresh Token

```bash
curl -X POST http://localhost:3000/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

#### 7. Logout

```bash
curl -X POST http://localhost:3000/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

#### 8. Verify Token (For Other Services)

```bash
curl -X POST http://localhost:3000/verify-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_ACCESS_TOKEN"
  }'
```

#### 9. Claim Guest Account

```bash
curl -X POST http://localhost:3000/guest/claim \
  -H "Authorization: Bearer GUEST_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "claimed@example.com",
    "password": "password123"
  }'
```

#### 10. List Users (Admin Only)

```bash
# First, you need to manually set a user as ADMIN in MongoDB
curl -X GET "http://localhost:3000/users?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

#### 11. Update User Role (Admin Only)

```bash
curl -X PATCH http://localhost:3000/users/USER_ID/role \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "CAMPAIGN_OWNER"
  }'
```

#### 12. Get User Statistics (Admin Only)

```bash
curl -X GET http://localhost:3000/users/stats \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Option 3: Using Postman

1. Import the OpenAPI spec from `http://localhost:3000/openapi`
2. Or manually create requests using the examples above

### Option 4: Using HTTPie

```bash
# Install HTTPie
brew install httpie  # macOS
# or
pip install httpie   # Python

# Register
http POST localhost:3000/register \
  email=test@example.com \
  password=password123 \
  name="Test User"

# Login
http POST localhost:3000/login \
  email=test@example.com \
  password=password123

# Get Profile
http GET localhost:3000/me \
  Authorization:"Bearer YOUR_ACCESS_TOKEN"
```

## 🔧 Testing Script

Create a file `test-auth-local.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="password123"
NAME="Test User"

echo "🚀 Testing Auth Service Locally"
echo "================================"

# 1. Register
echo -e "\n📝 1. Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"$NAME\"
  }")

echo "$REGISTER_RESPONSE" | jq '.'

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.tokens.accessToken')
REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.tokens.refreshToken')
USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.data.user.id')

echo "✅ Access Token: ${ACCESS_TOKEN:0:50}..."
echo "✅ Refresh Token: ${REFRESH_TOKEN:0:50}..."
echo "✅ User ID: $USER_ID"

# 2. Get Profile
echo -e "\n👤 2. Getting user profile..."
curl -s -X GET $BASE_URL/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'

# 3. Update Profile
echo -e "\n✏️ 3. Updating profile..."
curl -s -X PATCH $BASE_URL/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Updated $NAME\"}" | jq '.'

# 4. Refresh Token
echo -e "\n🔄 4. Refreshing token..."
REFRESH_RESPONSE=$(curl -s -X POST $BASE_URL/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

echo "$REFRESH_RESPONSE" | jq '.'

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.tokens.accessToken')
NEW_REFRESH_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.tokens.refreshToken')

echo "✅ New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."

# 5. Verify Token
echo -e "\n✔️ 5. Verifying token..."
curl -s -X POST $BASE_URL/verify-token \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$NEW_ACCESS_TOKEN\"}" | jq '.'

# 6. Create Guest
echo -e "\n👻 6. Creating guest user..."
GUEST_RESPONSE=$(curl -s -X POST $BASE_URL/guest \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Guest User\"}")

echo "$GUEST_RESPONSE" | jq '.'

GUEST_TOKEN=$(echo $GUEST_RESPONSE | jq -r '.data.tokens.accessToken')
GUEST_ID=$(echo $GUEST_RESPONSE | jq -r '.data.user.id')

echo "✅ Guest Token: ${GUEST_TOKEN:0:50}..."
echo "✅ Guest ID: $GUEST_ID"

# 7. Login
echo -e "\n🔐 7. Testing login..."
curl -s -X POST $BASE_URL/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }" | jq '.'

# 8. Logout
echo -e "\n👋 8. Logging out..."
curl -s -X POST $BASE_URL/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$NEW_REFRESH_TOKEN\"}" | jq '.'

# 9. Health Check
echo -e "\n❤️ 9. Health check..."
curl -s -X GET $BASE_URL/health | jq '.'

echo -e "\n✅ All tests completed!"
```

Make it executable and run:

```bash
chmod +x test-auth-local.sh
./test-auth-local.sh
```

## 🗄️ MongoDB Management

### View Data in MongoDB

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/care_for_all_dev

# List collections
show collections

# View users
db.users.find().pretty()

# View refresh tokens
db.refreshtokens.find().pretty()

# Count users
db.users.countDocuments()

# Find user by email
db.users.findOne({ email: "test@example.com" })

# Update user role to ADMIN
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { role: "ADMIN" } }
)

# Delete all test data
db.users.deleteMany({ email: /test/ })
db.refreshtokens.deleteMany({})
```

### MongoDB GUI Tools

**Option 1: MongoDB Compass** (Official GUI)
- Download: https://www.mongodb.com/products/compass
- Connect to: `mongodb://localhost:27017`

**Option 2: Studio 3T** (Free)
- Download: https://studio3t.com/download/

**Option 3: NoSQLBooster** (Free)
- Download: https://nosqlbooster.com/

## 🐛 Debugging

### Enable Debug Logging

```bash
# In .env.local
LOG_LEVEL=debug
```

### View MongoDB Queries

The service logs all MongoDB queries in development mode. Check the console output.

### Common Issues

#### 1. MongoDB Connection Failed

```bash
# Check if MongoDB is running
mongosh mongodb://localhost:27017

# If not running, start it
docker start mongodb-local
# OR
brew services start mongodb-community
```

#### 2. Port 3000 Already in Use

```bash
# Change port in .env.local
PORT=3001

# Or kill the process using port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

#### 3. JWT Token Expired

Tokens expire after 15 minutes. Get a new token by:
- Logging in again
- Using the refresh token endpoint

#### 4. Database Not Found

MongoDB creates databases automatically. Just make sure MongoDB is running.

## 📊 Monitoring

### View Logs

```bash
# Service logs are printed to console
# Look for:
# - ✅ MongoDB connected successfully
# - ✅ Starting auth-service on port 3000
# - Request completed logs
```

### Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0",
  "timestamp": "2025-11-21T...",
  "uptime": 123.456,
  "database": "connected"
}
```

## 🧪 Running Tests

```bash
# Make sure MongoDB is running
export MONGODB_URI="mongodb://localhost:27017/care_for_all_test"

# Run all tests
bun test

# Run specific test file
bun test tests/auth.test.ts

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## 🔐 Creating Admin User

To test admin endpoints, you need to manually set a user as ADMIN:

```bash
# Method 1: Using MongoDB Shell
mongosh mongodb://localhost:27017/care_for_all_dev

db.users.updateOne(
  { email: "test@example.com" },
  { $set: { role: "ADMIN" } }
)

# Method 2: Using MongoDB Compass
# 1. Connect to mongodb://localhost:27017
# 2. Navigate to care_for_all_dev > users
# 3. Find your user
# 4. Edit the 'role' field to 'ADMIN'
# 5. Save
```

Then login again to get a new token with admin permissions.

## 📝 Notes

- **Hot Reload**: The service automatically reloads when you change code
- **Database**: MongoDB creates collections automatically on first use
- **Indexes**: Indexes are created automatically when the service starts
- **TTL**: Expired refresh tokens are automatically deleted by MongoDB
- **CORS**: Enabled in development mode for all origins

## 🎯 Quick Reference

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/docs` | GET | No | Swagger UI |
| `/openapi` | GET | No | OpenAPI spec |
| `/health` | GET | No | Health check |
| `/register` | POST | No | Register user |
| `/login` | POST | No | Login user |
| `/guest` | POST | No | Create guest |
| `/refresh` | POST | No | Refresh token |
| `/logout` | POST | No | Logout |
| `/verify-token` | POST | No | Verify token |
| `/me` | GET | Yes | Get profile |
| `/me` | PATCH | Yes | Update profile |
| `/guest/claim` | POST | Yes (Guest) | Claim account |
| `/users` | GET | Yes (Admin) | List users |
| `/users/:id/role` | PATCH | Yes (Admin) | Update role |
| `/users/stats` | GET | Yes (Admin) | User stats |

## 🚀 Ready to Test!

1. Start MongoDB: `docker run -d -p 27017:27017 --name mongodb-local mongo:latest`
2. Start service: `bun run dev`
3. Open Swagger: `http://localhost:3000/docs`
4. Start testing! 🎉

Happy testing! 🧪

