# Swagger Documentation Guide

This guide explains how to use the interactive Swagger/OpenAPI documentation to test the Donation Service locally.

## Accessing the Documentation

1. Start the Donation Service locally:

```bash
./start-local.sh
```

2. Open your browser and navigate to:

```
http://localhost:3003/docs
```

## Interactive API Testing

The Swagger UI (Scalar) provides an interactive interface to test all API endpoints.

### Testing Donation Creation

#### Test 1: Successful Donation (Sufficient Balance)

1. Navigate to **POST /api/donations**
2. Click "Try it out"
3. Enter the following request body:

```json
{
  "campaignId": "campaign_123",
  "amount": 10000,
  "donorName": "John Doe",
  "donorEmail": "john@example.com",
  "bankAccountId": "bank_acc_001"
}
```

4. Click "Execute"
5. Expected Response (201):

```json
{
  "success": true,
  "data": {
    "id": "...",
    "campaignId": "campaign_123",
    "amount": 10000,
    "status": "COMPLETED",
    "isGuest": true,
    "donorName": "John Doe",
    "donorEmail": "john@example.com",
    "isAnonymous": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Test 2: Failed Donation (Insufficient Balance)

1. Use **POST /api/donations** again
2. Enter the following request body (using account with $0 balance):

```json
{
  "campaignId": "campaign_123",
  "amount": 10000,
  "donorName": "Jane Doe",
  "donorEmail": "jane@example.com",
  "bankAccountId": "bank_acc_007"
}
```

3. Expected Response (400):

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance. Current: 0, Required: 10000"
  }
}
```

### Testing with Authentication

#### For Authenticated Users

1. First, get a JWT token from the Auth Service
2. In Swagger UI, click the "Authorize" button (lock icon)
3. Enter: `Bearer <your-jwt-token>`
4. Now all requests will include the Authorization header

Example authenticated donation:

```json
{
  "campaignId": "campaign_123",
  "amount": 5000,
  "isAnonymous": false,
  "bankAccountId": "bank_acc_002"
}
```

The system will automatically:

- Extract user ID from the token
- Associate donation with the user account
- Set `isGuest: false`

### Testing Other Endpoints

#### GET /api/donations/{id}

1. Copy a donation ID from a previous create operation
2. Navigate to **GET /api/donations/{id}**
3. Click "Try it out"
4. Paste the donation ID
5. Click "Execute"

#### GET /api/donations

List donations with filters:

- `campaignId`: Filter by campaign
- `status`: Filter by donation status
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

Example query:

```
?campaignId=campaign_123&page=1&limit=10
```

#### GET /api/donations/campaign/{campaignId}

Get all donations for a specific campaign.

#### GET /api/donations/me

Get all donations made by the authenticated user (requires auth).

## Mock Bank Accounts

Use these pre-configured accounts for testing:

| Account ID        | Balance | Use Case                 |
| ----------------- | ------- | ------------------------ |
| `bank_acc_001`    | $1000   | Successful donations     |
| `bank_acc_002`    | $500    | Medium balance tests     |
| `bank_acc_003`    | $100    | Small donations          |
| `bank_acc_004`    | $50     | Micro donations          |
| `bank_acc_005`    | $10     | Very small donations     |
| `bank_acc_006`    | $1      | Minimum amount tests     |
| `bank_acc_007`    | $0      | Insufficient balance     |
| `bank_acc_guest`  | $1000   | Default for guest donors |

## Common Test Scenarios

### Scenario 1: Guest Donation Flow

```json
{
  "campaignId": "campaign_123",
  "amount": 2500,
  "donorName": "Anonymous Donor",
  "donorEmail": "anon@example.com",
  "isAnonymous": true,
  "bankAccountId": "bank_acc_001"
}
```

### Scenario 2: Registered User Donation

1. Login to Auth Service to get JWT token
2. Use token in Authorization header
3. Create donation without providing `donorName` or `donorEmail`:

```json
{
  "campaignId": "campaign_123",
  "amount": 5000,
  "bankAccountId": "bank_acc_002"
}
```

### Scenario 3: Large Donation

```json
{
  "campaignId": "campaign_medical",
  "amount": 50000,
  "donorName": "Major Donor",
  "donorEmail": "major@example.com",
  "isAnonymous": false,
  "bankAccountId": "bank_acc_001"
}
```

### Scenario 4: Multiple Small Donations

Create multiple donations for the same campaign to test aggregation:

```json
{
  "campaignId": "campaign_charity",
  "amount": 500,
  "donorName": "Donor 1",
  "donorEmail": "donor1@example.com",
  "bankAccountId": "bank_acc_003"
}
```

## Testing Donation States

Donations progress through these states:

1. **PENDING** - Initial state
2. **BALANCE_CHECK** - Checking bank balance
3. **AUTHORIZED** - Balance verified, payment authorized
4. **CAPTURED** - Payment captured
5. **COMPLETED** - Donation completed successfully
6. **FAILED** - Donation failed (insufficient balance, etc.)

The state machine is automatic - you cannot manually transition states via the API.

## Error Handling

### Common Errors

#### 400 - Bad Request

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance. Current: 0, Required: 10000"
  }
}
```

#### 404 - Campaign Not Found

```json
{
  "success": false,
  "error": {
    "code": "CAMPAIGN_NOT_FOUND",
    "message": "Campaign not found"
  }
}
```

#### 401 - Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization token required"
  }
}
```

## Advanced Testing

### Testing Event Publishing

1. Create a donation
2. Check the Outbox collection in MongoDB:

```bash
mongosh donation-service
> db.outboxes.find({ status: "PENDING" })
```

3. The worker should publish these events to RabbitMQ within 1 second

### Testing Refunds (Admin Only)

1. Get admin JWT token from Auth Service
2. Authorize with admin token in Swagger UI
3. Navigate to **POST /api/donations/{id}/refund**
4. Enter donation ID and reason:

```json
{
  "reason": "Duplicate payment"
}
```

5. Donation status will change to REFUNDED
6. Funds will be returned to the bank account

## Troubleshooting

### Service Not Responding

Check if MongoDB and RabbitMQ are running:

```bash
nc -z localhost 27017  # MongoDB
nc -z localhost 5672   # RabbitMQ
```

### Cannot Create Donations

1. Verify Campaign Service is running on port 3002
2. Check MongoDB connection in logs
3. Ensure campaign exists (use Campaign Service API)

### Events Not Publishing

1. Check worker is running: `bun run dev:worker`
2. Check Outbox status: `db.outboxes.find()`
3. Verify RabbitMQ connection in worker logs

## Tips

1. **Use the "Try it out" button** - Makes testing much easier
2. **Save successful response IDs** - Use them for subsequent GET requests
3. **Test edge cases** - Try invalid data, missing fields, etc.
4. **Monitor logs** - Watch the terminal for detailed logs
5. **Use different bank accounts** - Test various balance scenarios

## Additional Resources

- **OpenAPI Spec**: http://localhost:3003/openapi
- **Health Check**: http://localhost:3003/health
- **Service Info**: http://localhost:3003/

Happy testing! 🚀

