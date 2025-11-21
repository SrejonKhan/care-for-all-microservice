# MongoDB Migration Summary

## ✅ Migration Completed

The Auth Service has been successfully migrated from **PostgreSQL + Prisma** to **MongoDB + Mongoose**.

## 🔄 Changes Made

### 1. Dependencies Updated
**Removed:**
- `@prisma/client` - Prisma ORM client
- `prisma` - Prisma CLI

**Added:**
- `mongoose` (^8.8.3) - MongoDB ODM for Node.js

### 2. Database Layer Rewritten

**Removed:**
- `prisma/schema.prisma` - Prisma schema file
- Prisma client configuration

**Added:**
- `src/models/user.model.ts` - Mongoose User model
- `src/models/refresh-token.model.ts` - Mongoose RefreshToken model
- `src/models/index.ts` - Model exports
- `src/config/database.ts` - MongoDB connection management (rewritten)

### 3. Models Structure

#### User Model (`src/models/user.model.ts`)
```typescript
- _id: string (MongoDB ObjectId)
- email: string | null (unique, sparse index)
- passwordHash: string | null
- name: string
- role: UserRole enum (USER, CAMPAIGN_OWNER, ADMIN)
- isGuest: boolean
- emailVerified: boolean
- createdAt: Date (auto-managed)
- updatedAt: Date (auto-managed)
```

**Indexes:**
- email (unique, sparse)
- role
- isGuest
- createdAt

#### RefreshToken Model (`src/models/refresh-token.model.ts`)
```typescript
- _id: string (MongoDB ObjectId)
- userId: string (reference to User)
- tokenHash: string
- expiresAt: Date
- revoked: boolean
- createdAt: Date
```

**Indexes:**
- userId
- tokenHash
- expiresAt
- revoked
- TTL index on expiresAt (auto-delete after 7 days)

### 4. Services Updated

All services updated to use Mongoose instead of Prisma:

**`src/services/user.service.ts`**
- Changed from Prisma queries to Mongoose queries
- Updated `findById()`, `findByEmail()`, `createUser()`, etc.
- Changed `prisma.user.findUnique()` → `User.findById()`
- Changed `prisma.user.create()` → `User.create()`
- Updated aggregation queries for statistics

**`src/services/token.service.ts`**
- Changed from Prisma to Mongoose for RefreshToken operations
- Updated `generateRefreshToken()` to use Mongoose
- Changed `prisma.refreshToken.create()` → `RefreshToken.create()`
- Updated token validation and revocation logic

**`src/services/auth.service.ts`**
- Updated UserRole import from `@prisma/client` to local models
- No other changes needed (uses other services)

**`src/services/password.service.ts`**
- No changes needed (pure utility service)

### 5. Types Updated

**`src/types/auth.types.ts`**
- Changed UserRole import from `@prisma/client` to `../models/user.model`
- Re-exported UserRole for convenience

### 6. Configuration Updated

**`src/config/database.ts`** - Completely rewritten:
- Removed Prisma client singleton
- Added Mongoose connection management
- Added connection pooling (min: 2, max: 10)
- Added health check using MongoDB ping
- Added graceful shutdown
- Added debug logging in development

**`src/index.ts`**
- Added `connectDatabase()` call before starting server
- Updated imports from Prisma to Mongoose

### 7. Tests Updated

All test files updated to work with MongoDB:

**`tests/token.test.ts`**
- Changed from Prisma to Mongoose
- Updated `beforeAll()` to call `connectDatabase()`
- Updated `afterAll()` to call `disconnectDatabase()`
- Changed `prisma.user.create()` → `User.create()`
- Changed `prisma.refreshToken.findUnique()` → `RefreshToken.findById()`

**`tests/auth.test.ts`**
- Updated database connection/disconnection
- Changed `prisma.user.deleteMany()` → `User.deleteMany()`
- Changed `prisma.refreshToken.deleteMany()` → `RefreshToken.deleteMany()`

**`tests/api.test.ts`**
- Updated imports and database operations
- Changed Prisma operations to Mongoose

**`tests/password.test.ts`**
- No changes needed (no database operations)

### 8. Scripts Updated

**`package.json`** - Removed Prisma scripts:
- ❌ `db:generate` - No longer needed
- ❌ `db:push` - No longer needed
- ❌ `db:migrate` - No longer needed
- ❌ `db:studio` - No longer needed

MongoDB doesn't require code generation like Prisma.

## 🔧 Configuration Changes

### Environment Variables

**Changed:**
```bash
# Old (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/care_for_all

# New (MongoDB)
MONGODB_URI=mongodb://localhost:27017/care_for_all
# OR
DATABASE_URL=mongodb://localhost:27017/care_for_all
```

The service accepts both `MONGODB_URI` and `DATABASE_URL` for MongoDB connection.

### Connection Options
- **Pool Size**: Min 2, Max 10 connections
- **Server Selection Timeout**: 5 seconds
- **Socket Timeout**: 45 seconds
- **Auto-Reconnect**: Enabled by default
- **TTL Indexes**: Automatic cleanup of expired refresh tokens

## 📊 Key Differences: Prisma vs Mongoose

### Query Syntax

**Prisma:**
```typescript
await prisma.user.findUnique({ where: { id } });
await prisma.user.create({ data: { ... } });
await prisma.user.updateMany({ where: { ... }, data: { ... } });
```

**Mongoose:**
```typescript
await User.findById(id);
await User.create({ ... });
await User.updateMany({ ... }, { ... });
```

### ID Field

**Prisma:**
- Uses `id` field
- Type: `string` (UUID)

**Mongoose:**
- Uses `_id` field
- Type: `ObjectId` (converted to string)
- Automatically transformed to `id` in JSON responses

### Timestamps

**Prisma:**
- Manually defined: `createdAt`, `updatedAt`
- Requires `@default(now())` and `@updatedAt`

**Mongoose:**
- Automatic with `timestamps: true`
- Managed by Mongoose

### Indexes

**Prisma:**
```prisma
@@index([field])
@@unique([field])
```

**Mongoose:**
```typescript
schema.index({ field: 1 });
field: { type: String, unique: true }
```

### Relations

**Prisma:**
- Explicit relations with `@relation`
- Foreign keys enforced

**Mongoose:**
- References via `ref` option
- Manual population needed
- No foreign key constraints (MongoDB limitation)

## 🚀 How to Use

### 1. Start MongoDB

**Using Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Using Docker Compose:**
```yaml
mongodb:
  image: mongo:latest
  ports:
    - "27017:27017"
  volumes:
    - mongodb-data:/data/db
```

### 2. Configure Environment

```bash
export MONGODB_URI="mongodb://localhost:27017/care_for_all"
# OR
export DATABASE_URL="mongodb://localhost:27017/care_for_all"
```

### 3. Run the Service

```bash
cd apps/backend/auth-service
bun install
bun run dev
```

No schema generation or migrations needed! MongoDB is schema-less.

### 4. Run Tests

```bash
# Make sure MongoDB is running
export MONGODB_URI="mongodb://localhost:27017/care_for_all_test"
bun test
```

## 📝 MongoDB Features Used

### 1. Sparse Indexes
- Used for `email` field to allow multiple `null` values
- Enables guest users without email

### 2. TTL Indexes
- Automatic deletion of expired refresh tokens
- Set to 7 days after `expiresAt` date

### 3. Aggregation Pipeline
- Used for user statistics
- Groups users by role

### 4. Lean Queries
- Removed from `listUsers()` to avoid type issues
- Returns full Mongoose documents

### 5. Schema Validation
- Mongoose schema validation
- Enum validation for UserRole
- Required field validation

## ⚠️ Important Notes

### 1. No Foreign Key Constraints
MongoDB doesn't enforce foreign key constraints. The application must ensure referential integrity.

### 2. No Transactions (Yet)
Current implementation doesn't use MongoDB transactions. For production, consider adding transactions for critical operations.

### 3. ObjectId vs UUID
MongoDB uses ObjectId (12 bytes) instead of UUID (16 bytes). IDs are converted to strings in API responses.

### 4. Case-Sensitive Queries
MongoDB queries are case-sensitive by default. Email addresses are converted to lowercase before storage.

### 5. Index Creation
Indexes are created automatically when the application starts. For production, consider creating indexes manually.

## 🔮 Future Enhancements

### 1. Replica Set Support (Payment Service)
The payment service will use MongoDB replica sets for transactions:

```typescript
// Payment service will use replica set
const client = await MongoClient.connect(
  'mongodb://host1:27017,host2:27017,host3:27017/payment?replicaSet=pss-replica'
);
```

### 2. Transactions
Add transaction support for critical operations:

```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  // Operations
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
}
```

### 3. Sharding
For horizontal scaling:

```typescript
// Shard key on userId
sh.shardCollection("care_for_all.refresh_tokens", { userId: 1 });
```

### 4. Change Streams
Real-time notifications:

```typescript
const changeStream = User.watch();
changeStream.on('change', (change) => {
  // Handle changes
});
```

## ✅ Migration Checklist

- [x] Remove Prisma dependencies
- [x] Add Mongoose dependency
- [x] Create Mongoose models
- [x] Update database configuration
- [x] Migrate user service
- [x] Migrate token service
- [x] Migrate auth service
- [x] Update types and imports
- [x] Update all tests
- [x] Fix TypeScript errors
- [x] Update documentation
- [x] Remove Prisma schema file
- [x] Update package.json scripts

## 🎉 Summary

The migration from PostgreSQL + Prisma to MongoDB + Mongoose is **complete and successful**!

**Benefits:**
- ✅ Simpler setup (no code generation)
- ✅ More flexible schema
- ✅ Better for document-based data
- ✅ Automatic TTL for token cleanup
- ✅ Ready for replica sets (payment service)
- ✅ All tests passing
- ✅ No linting errors

**All functionality preserved:**
- User registration and login
- Guest user support
- Token management
- Role-based access control
- Profile management
- Admin operations

The service is ready for production use with MongoDB! 🚀

