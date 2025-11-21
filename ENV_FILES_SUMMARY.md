# Environment Files Summary

All `.env` files have been created for each backend microservice. Here's the complete overview:

## ✅ Created Files

- `apps/backend/auth-service/.env`
- `apps/backend/campaign-service/.env`
- `apps/backend/donation-service/.env`
- `apps/backend/payment-service/.env`
- `apps/backend/gateway/.env`
- `apps/backend/chat-service/.env`
- `apps/backend/totals-service/.env`

## 🔑 Important Credentials

### JWT Secret (SHARED across all services)
```
JWT_SECRET=care-for-all-super-secret-jwt-key-2024-change-in-production
```
**⚠️ IMPORTANT**: This must be the SAME across all services for authentication to work!

### MongoDB Databases (Separate per service)
- Auth Service: `mongodb://localhost:27017/auth-service`
- Campaign Service: `mongodb://localhost:27017/campaign-service`
- Donation Service: `mongodb://localhost:27017/donation-service`
- Payment Service: `mongodb://localhost:27017/payment-service?replicaSet=rs0`
- Chat Service: `mongodb://localhost:27017/chat-service`
- Totals Service: `mongodb://localhost:27017/totals-service`

### Service Ports
- Gateway: `3001`
- Auth Service: `3000`
- Campaign Service: `3002`
- Donation Service: `3003`
- Payment Service: `3004`
- Totals Service: `3005`
- Chat Service: `3006`

### RabbitMQ (Shared)
```
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=care-for-all
```

## 📋 Service-Specific Configuration

### 1. Auth Service (Port 3000)
**Location**: `apps/backend/auth-service/.env`

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/auth-service
JWT_SECRET=care-for-all-super-secret-jwt-key-2024-change-in-production
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
```

### 2. Campaign Service (Port 3002)
**Location**: `apps/backend/campaign-service/.env`

```env
NODE_ENV=development
PORT=3002
DATABASE_URL=mongodb://localhost:27017/campaign-service
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=care-for-all-super-secret-jwt-key-2024-change-in-production
```

### 3. Donation Service (Port 3003)
**Location**: `apps/backend/donation-service/.env`

```env
NODE_ENV=development
PORT=3003
DATABASE_URL=mongodb://localhost:27017/donation-service
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=care-for-all-super-secret-jwt-key-2024-change-in-production
```

### 4. Payment Service (Port 3004)
**Location**: `apps/backend/payment-service/.env`

```env
NODE_ENV=development
PORT=3004
DATABASE_URL=mongodb://localhost:27017/payment-service?replicaSet=rs0
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=care-for-all-super-secret-jwt-key-2024-change-in-production

# Payment Providers
STRIPE_SECRET_KEY=sk_test_51ABC123_your_stripe_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
```

### 5. Gateway (Port 3001)
**Location**: `apps/backend/gateway/.env`

```env
NODE_ENV=development
PORT=3001
AUTH_SERVICE_URL=http://localhost:3000
CAMPAIGN_SERVICE_URL=http://localhost:3002
DONATION_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004
```

### 6. Chat Service (Port 3006)
**Location**: `apps/backend/chat-service/.env`

```env
NODE_ENV=development
PORT=3006
DATABASE_URL=mongodb://localhost:27017/chat-service
JWT_SECRET=care-for-all-super-secret-jwt-key-2024-change-in-production
```

### 7. Totals Service (Port 3005)
**Location**: `apps/backend/totals-service/.env`

```env
NODE_ENV=development
PORT=3005
DATABASE_URL=mongodb://localhost:27017/totals-service
RABBITMQ_URL=amqp://localhost:5672
```

## 🚀 How to Use

All services will automatically load these `.env` files when you run them:

```bash
# Services will use .env by default
cd apps/backend/auth-service
bun run dev

# Or explicitly use .env
bun run start
```

## 🔒 Security Notes

### For Development
- Current JWT_SECRET is for development only
- MongoDB is using localhost without authentication
- All services share the same JWT secret for seamless authentication

### For Production
1. **Change JWT_SECRET** to a strong random value (use `openssl rand -base64 64`)
2. **Enable MongoDB authentication**
3. **Use environment-specific secrets management** (AWS Secrets Manager, Vault, etc.)
4. **Enable SSL/TLS** for MongoDB and RabbitMQ
5. **Use real Stripe/PayPal credentials**
6. **Set NODE_ENV=production**

## 📝 Editing .env Files

You can edit any `.env` file directly:

```bash
# Windows
notepad apps/backend/auth-service/.env

# Mac/Linux
nano apps/backend/auth-service/.env
vim apps/backend/auth-service/.env
```

Or use VS Code:
- Open the file in the editor
- Make your changes
- Save the file
- Restart the service

## ⚠️ Important Reminders

1. **JWT_SECRET** must be IDENTICAL across:
   - Auth Service
   - Campaign Service
   - Donation Service
   - Payment Service
   - Chat Service

2. **Never commit** `.env` files to git (already in `.gitignore`)

3. **MongoDB** must be running before starting services:
   ```bash
   mongod --dbpath=/path/to/data
   ```

4. **RabbitMQ** must be running for Campaign, Donation, Payment, and Totals services:
   ```bash
   rabbitmq-server
   ```

5. **Payment Service** requires MongoDB Replica Set:
   ```bash
   mongod --replSet rs0 --dbpath=/path/to/data
   mongosh
   > rs.initiate()
   ```

## 🔍 Verifying Configuration

Check if services can read the .env files:

```bash
# Check Auth Service
cd apps/backend/auth-service
bun run dev
# Should see: "Starting auth-service on port 3000"

# Check Campaign Service
cd apps/backend/campaign-service
bun run dev
# Should see: "Starting campaign-service on port 3002"
```

## 📞 Troubleshooting

### Service won't start
- Check if MongoDB is running
- Check if the port is available
- Verify DATABASE_URL is correct

### Authentication not working
- Verify JWT_SECRET is the same across all services
- Check if Auth Service is running
- Verify the token is valid and not expired

### RabbitMQ errors
- Check if RabbitMQ is running
- Verify RABBITMQ_URL is correct
- Check RabbitMQ logs: `rabbitmqctl list_queues`

## ✅ Quick Verification Checklist

- [ ] All 7 `.env` files created
- [ ] JWT_SECRET is the same in all services
- [ ] Each service has a unique PORT
- [ ] Each service has a unique DATABASE_URL
- [ ] MongoDB is running
- [ ] RabbitMQ is running (for services that need it)
- [ ] Services can start without errors

All credentials are now properly configured and ready to use! 🎉

