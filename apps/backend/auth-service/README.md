# Auth Service

Authentication and authorization service for the CareForAll donation platform.

## Features

- ✅ User registration with email/password
- ✅ User login with JWT tokens
- ✅ Guest user support (donations without registration)
- ✅ Guest account claiming (convert guest to registered user)
- ✅ JWT access tokens (short-lived, 15 minutes)
- ✅ JWT refresh tokens (long-lived, 7 days, stored in database)
- ✅ Token refresh with rotation
- ✅ Logout (single device and all devices)
- ✅ Role-based access control (USER, CAMPAIGN_OWNER, ADMIN)
- ✅ Password hashing with bcrypt
- ✅ Token verification endpoint (for other services)
- ✅ User profile management
- ✅ Admin user management
- ✅ OpenAPI documentation with Scalar UI
- ✅ Comprehensive unit and integration tests
- ✅ OpenTelemetry tracing support
- ✅ Structured logging

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL with Prisma ORM
- **Password Hashing**: bcrypt
- **JWT**: jsonwebtoken
- **Validation**: Zod
- **Documentation**: OpenAPI 3.1 with Scalar
- **Testing**: Bun test

## Architecture

### Database Schema

#### Users Table
- `id` - UUID primary key
- `email` - Unique email (nullable for guests)
- `password_hash` - Hashed password (nullable for guests)
- `name` - User's name
- `role` - Enum: USER, CAMPAIGN_OWNER, ADMIN
- `is_guest` - Boolean flag for guest users
- `email_verified` - Email verification status
- `created_at`, `updated_at` - Timestamps

#### Refresh Tokens Table
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `token_hash` - Token hash for validation
- `expires_at` - Expiration timestamp
- `revoked` - Boolean flag for revoked tokens
- `created_at` - Creation timestamp

### Service Architecture

```
src/
├── config/
│   └── database.ts          # Prisma client setup
├── middleware/
│   ├── auth.ts              # JWT verification middleware
│   └── rbac.ts              # Role-based access control
├── routes/
│   ├── auth.ts              # Authentication routes
│   ├── user.ts              # User management routes
│   └── health.ts            # Health check
├── services/
│   ├── auth.service.ts      # Auth business logic
│   ├── token.service.ts     # JWT token management
│   ├── password.service.ts  # Password hashing
│   └── user.service.ts      # User CRUD operations
├── schemas/
│   ├── auth.schema.ts       # Auth validation schemas
│   └── user.schema.ts       # User validation schemas
├── types/
│   └── auth.types.ts        # TypeScript types
└── index.ts                 # Main application
```

## API Endpoints

### Public Endpoints

#### POST /register
Register a new user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "isGuest": false,
      "emailVerified": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "jwt_token",
      "expiresIn": 900
    }
  }
}
```

#### POST /login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as /register

#### POST /guest
Create a guest user for donations without registration.

**Request:**
```json
{
  "name": "Guest User"
}
```

**Response:** Same structure as /register (user.isGuest = true, email = null)

#### POST /refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:** Same as /register (new tokens generated)

#### POST /logout
Revoke refresh token and logout.

**Request:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

#### POST /verify-token
Verify JWT token (for other services).

**Request:**
```json
{
  "token": "jwt_access_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "isGuest": false
  }
}
```

### Protected Endpoints (Require Authentication)

#### GET /me
Get current user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "isGuest": false,
    "emailVerified": false,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### PATCH /me
Update current user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

**Response:** Same as GET /me

#### POST /guest/claim
Convert guest user to registered user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as /register

### Admin Endpoints (Require ADMIN Role)

#### GET /users
List all users (paginated).

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "total": 100,
    "page": 1,
    "totalPages": 5
  }
}
```

#### PATCH /users/:id/role
Update user role.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request:**
```json
{
  "role": "CAMPAIGN_OWNER"
}
```

**Response:** User object with updated role

#### GET /users/stats
Get user statistics.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1000,
    "totalGuests": 200,
    "totalRegistered": 800,
    "usersByRole": {
      "USER": 700,
      "CAMPAIGN_OWNER": 90,
      "ADMIN": 10
    }
  }
}
```

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/care_for_all

# JWT
JWT_SECRET=your_secret_key_change_in_production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Password Hashing
BCRYPT_ROUNDS=10

# OpenTelemetry (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_TRACES_ENABLED=true
```

## Development

### Quick Start (Local Testing)

**Easiest way to get started:**

```bash
# Make script executable
chmod +x start-local.sh

# Start everything (MongoDB + Service)
./start-local.sh
```

This script will:
- ✅ Check/start MongoDB
- ✅ Create `.env.local` if needed
- ✅ Install dependencies
- ✅ Start the service with hot reload

**Then open:**
- 📚 **Swagger Docs**: http://localhost:3000/docs
- 📄 **OpenAPI Spec**: http://localhost:3000/openapi
- ❤️ **Health Check**: http://localhost:3000/health

### Manual Setup

#### 1. Install Dependencies

```bash
bun install
```

#### 2. Setup MongoDB

```bash
# Option 1: Using Docker (recommended for local dev)
docker run -d -p 27017:27017 --name mongodb-local mongo:latest

# Option 2: Install MongoDB locally
# Visit: https://www.mongodb.com/try/download/community
```

#### 3. Configure Environment

Create `.env.local`:

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
MONGODB_URI=mongodb://localhost:27017/care_for_all_dev
JWT_SECRET=local_dev_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
```

#### 4. Run Development Server

```bash
# With .env.local file
bun --env-file=.env.local run dev

# Or with environment variables
export MONGODB_URI="mongodb://localhost:27017/care_for_all_dev"
bun run dev
```

The service will be available at `http://localhost:3000`

### Testing Locally

#### Interactive Testing (Swagger UI)

Open `http://localhost:3000/docs` in your browser to:
- ✅ Browse all endpoints
- ✅ Test endpoints directly
- ✅ See request/response examples
- ✅ Authenticate with JWT tokens

**See [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) for detailed instructions**

#### Automated Testing Script

```bash
# Make script executable
chmod +x test-local.sh

# Run all endpoint tests
./test-local.sh
```

This will test:
- User registration
- Login
- Profile management
- Token refresh
- Guest users
- Token verification
- And more!

**See [LOCAL_TESTING.md](./LOCAL_TESTING.md) for detailed testing guide**

### Run Unit Tests

```bash
# Make sure MongoDB is running
export MONGODB_URI="mongodb://localhost:27017/care_for_all_test"

# Run all tests
bun test

# Run specific test file
bun test tests/password.test.ts

# Run tests in watch mode
bun test --watch
```

## Production

### Build

```bash
bun run build
```

### Start

```bash
bun run start
```

### Docker

```bash
# Build image
docker build -t auth-service .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  auth-service
```

## Security Best Practices

### Implemented

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT tokens with expiration
- ✅ Refresh token rotation on use
- ✅ Token revocation support
- ✅ SQL injection prevention via Prisma
- ✅ Input validation with Zod
- ✅ Role-based access control
- ✅ Secure password requirements (min 6 characters)

### Recommended for Production

- [ ] Rate limiting on authentication endpoints
- [ ] Email verification flow
- [ ] Password reset flow
- [ ] Two-factor authentication (2FA)
- [ ] Account lockout after failed attempts
- [ ] HTTPS only
- [ ] Secure cookie settings for refresh tokens
- [ ] CORS configuration
- [ ] Helmet.js for security headers
- [ ] Audit logging for sensitive operations

## Testing

The service includes comprehensive test coverage:

- **Unit Tests**: Test individual services (password, token, auth, user)
- **Integration Tests**: Test API endpoints end-to-end

### Test Coverage

- ✅ Password hashing and verification
- ✅ Password validation
- ✅ JWT token generation and verification
- ✅ Refresh token management
- ✅ Token revocation
- ✅ User registration
- ✅ User login
- ✅ Guest user creation
- ✅ Guest account claiming
- ✅ Token refresh flow
- ✅ Logout flow
- ✅ Profile management
- ✅ Role-based access control

## Observability

### Logging

All logs are structured JSON and include:
- Service name
- Log level
- Timestamp
- Message
- Context (userId, email, etc.)
- Trace ID (when OpenTelemetry is enabled)

### Tracing

OpenTelemetry tracing is supported and can be enabled via environment variables. Traces include:
- HTTP requests
- Database queries
- Service operations

### Metrics

The service exposes metrics for:
- Request count
- Request duration
- Error rate
- Database query performance

## Role-Based Access Control (RBAC)

### Roles

1. **USER** (Level 1)
   - Can donate to campaigns
   - Can view campaigns
   - Can update own profile

2. **CAMPAIGN_OWNER** (Level 2)
   - All USER permissions
   - Can create and manage campaigns

3. **ADMIN** (Level 3)
   - All CAMPAIGN_OWNER permissions
   - Can manage users
   - Can update user roles
   - Can view user statistics

### Middleware

- `authMiddleware` - Verify JWT token
- `requireRole(role)` - Require minimum role level
- `requireExactRole(role)` - Require exact role
- `requireAnyRole([roles])` - Require any of the specified roles
- `requireRegisteredUser()` - Prevent guest users
- `requireAdmin` - Shorthand for requireRole(ADMIN)
- `requireCampaignOwner` - Shorthand for requireRole(CAMPAIGN_OWNER)

## Guest User Flow

1. **Create Guest**: POST /guest
   - Returns user with `isGuest: true` and `email: null`
   - Guest can make donations

2. **Make Donations**: Guest uses access token to donate

3. **Claim Account**: POST /guest/claim
   - Guest provides email and password
   - Account is converted to registered user
   - All previous donations are linked to the account
   - New tokens are issued

## Token Management

### Access Token
- **Lifetime**: 15 minutes (configurable)
- **Storage**: Client-side (memory or secure storage)
- **Contains**: userId, email, role, isGuest
- **Use**: API authentication

### Refresh Token
- **Lifetime**: 7 days (configurable)
- **Storage**: Database + client-side
- **Contains**: userId, tokenId
- **Use**: Get new access token
- **Rotation**: New refresh token issued on each use
- **Revocation**: Can be revoked (logout)

### Token Flow

```
1. Login/Register → Access Token + Refresh Token
2. Use Access Token → API calls
3. Access Token Expires → Use Refresh Token
4. Refresh Token → New Access Token + New Refresh Token (rotation)
5. Logout → Revoke Refresh Token
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

- `INVALID_CREDENTIALS` - Wrong email or password
- `USER_EXISTS` - Email already registered
- `USER_NOT_FOUND` - User doesn't exist
- `INVALID_TOKEN` - Invalid JWT token
- `TOKEN_EXPIRED` - JWT token expired
- `INVALID_REFRESH_TOKEN` - Invalid or revoked refresh token
- `VALIDATION_ERROR` - Input validation failed
- `INSUFFICIENT_PERMISSIONS` - User lacks required role
- `GUEST_NOT_ALLOWED` - Guest users not allowed
- `INTERNAL_ERROR` - Server error

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Follow TypeScript best practices

## License

Proprietary - CareForAll Platform

