# Swagger API Documentation Guide

This guide explains how to use the interactive Swagger documentation for the Campaign Service API.

## Accessing the Documentation

### Local Development

Open your browser and navigate to:

```
http://localhost:3001/docs
```

### Docker Environment

```
http://campaign-service:3001/docs
```

## Features

The Swagger UI provides:

- **Interactive API Testing**: Test endpoints directly from the browser
- **Request/Response Examples**: See example payloads and responses
- **Schema Validation**: View request and response schemas
- **Authentication**: Test protected endpoints with JWT tokens

## Using the Swagger UI

### 1. Viewing Endpoints

The left sidebar shows all available endpoints grouped by tags:

- **Campaigns**: Campaign CRUD operations
- **Health**: Health check endpoint

Click on any endpoint to expand its details.

### 2. Testing Public Endpoints

For public endpoints (no authentication required):

1. Click on the endpoint (e.g., `GET /campaigns`)
2. Click the **"Try it out"** button
3. Fill in any required parameters
4. Click **"Execute"**
5. View the response below

**Example: List Campaigns**

```
GET /campaigns?status=ACTIVE&page=1&pageSize=10
```

### 3. Testing Protected Endpoints

For protected endpoints (require authentication):

1. **Get an Access Token** from the Auth Service:

```bash
# Login or register
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "yourpassword"
  }'
```

2. **Authorize in Swagger**:
   - Click the **"Authorize"** button at the top right
   - Enter your token in the format: `Bearer YOUR_ACCESS_TOKEN`
   - Click **"Authorize"**
   - Click **"Close"**

3. **Test the Endpoint**:
   - Click on a protected endpoint (e.g., `POST /campaigns`)
   - Click **"Try it out"**
   - Fill in the request body
   - Click **"Execute"**

**Example: Create Campaign**

Request Body:
```json
{
  "title": "Medical Support for John",
  "description": "Help John recover from surgery",
  "goalAmount": 50000,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "category": "Medical"
}
```

### 4. Understanding Responses

Each response includes:

- **Status Code**: HTTP status (200, 201, 400, 401, etc.)
- **Response Body**: JSON response data
- **Headers**: Response headers
- **Duration**: Request execution time

**Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "65abc123...",
    "title": "Medical Support for John",
    "description": "Help John recover from surgery",
    "goalAmount": 50000,
    "currentAmount": 0,
    "status": "DRAFT",
    "ownerId": "user_123",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.000Z",
    "category": "Medical",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (400 Bad Request)**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "End date must be after start date"
  }
}
```

## Common Use Cases

### 1. Create a Campaign

1. Authorize with your JWT token
2. Navigate to `POST /campaigns`
3. Click "Try it out"
4. Enter campaign details:

```json
{
  "title": "Emergency Medical Fund",
  "description": "Urgent medical treatment needed",
  "goalAmount": 100000,
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-06-30T23:59:59Z",
  "category": "Emergency"
}
```

5. Click "Execute"
6. Note the campaign ID from the response

### 2. List Active Campaigns

1. Navigate to `GET /campaigns`
2. Click "Try it out"
3. Set parameters:
   - `status`: ACTIVE
   - `page`: 1
   - `pageSize`: 10
4. Click "Execute"

### 3. Update a Campaign

1. Authorize with your JWT token (must be campaign owner or admin)
2. Navigate to `PATCH /campaigns/{id}`
3. Click "Try it out"
4. Enter the campaign ID
5. Enter update data:

```json
{
  "title": "Updated Campaign Title",
  "status": "ACTIVE"
}
```

6. Click "Execute"

### 4. Get Campaign Details

1. Navigate to `GET /campaigns/{id}`
2. Click "Try it out"
3. Enter the campaign ID
4. Click "Execute"

## Query Parameters

### Pagination

All list endpoints support pagination:

- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 10, max: 100)

### Filters

Campaign list supports filtering:

- `status`: Filter by campaign status (DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED)
- `ownerId`: Filter by campaign owner
- `category`: Filter by category

**Example**:
```
GET /campaigns?status=ACTIVE&category=Medical&page=1&pageSize=20
```

## Response Schemas

### Campaign Object

```typescript
{
  id: string;              // Campaign ID
  title: string;           // Campaign title
  description: string;     // Campaign description
  goalAmount: number;      // Target amount
  currentAmount: number;   // Current raised amount
  status: string;          // DRAFT | ACTIVE | PAUSED | COMPLETED | CANCELLED
  ownerId: string;         // Owner user ID
  startDate: string;       // ISO 8601 date
  endDate: string;         // ISO 8601 date
  category?: string;       // Optional category
  imageUrl?: string;       // Optional image URL
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

### Paginated Response

```typescript
{
  success: boolean;
  data: {
    items: Campaign[];     // Array of campaigns
    total: number;         // Total count
    page: number;          // Current page
    pageSize: number;      // Page size
    totalPages: number;    // Total pages
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_TOKEN` | Authorization header missing |
| `INVALID_TOKEN` | Invalid or expired JWT token |
| `INVALID_TOKEN_FORMAT` | Authorization header format incorrect |
| `CAMPAIGN_NOT_FOUND` | Campaign does not exist |
| `INVALID_DATE_RANGE` | End date before start date |
| `FORBIDDEN` | Insufficient permissions |
| `CREATE_FAILED` | Failed to create campaign |
| `UPDATE_FAILED` | Failed to update campaign |
| `DELETE_FAILED` | Failed to delete campaign |
| `INTERNAL_ERROR` | Server error |

## Tips

1. **Use the "Authorize" button** at the top right to set your JWT token once for all protected endpoints
2. **Check the "Schemas" section** at the bottom of the page for detailed type definitions
3. **Copy the cURL command** from the response to use in your terminal or scripts
4. **Download the OpenAPI spec** at `/openapi` for use with code generators
5. **Refresh the page** if you update the API and don't see changes

## Downloading OpenAPI Specification

To download the raw OpenAPI specification:

```bash
curl http://localhost:3001/openapi > openapi.json
```

Use this with tools like:
- **Postman**: Import the spec to create a collection
- **OpenAPI Generator**: Generate client SDKs
- **Swagger Editor**: Edit and validate the spec

## Troubleshooting

### "Authorize" button not working

- Make sure you're using the format: `Bearer YOUR_TOKEN`
- Check that your token hasn't expired
- Verify the JWT_SECRET matches the Auth Service

### Endpoints returning 401

- Click "Authorize" and enter your token
- Refresh your token if it's expired
- Ensure you're using a valid token from the Auth Service

### Can't see response data

- Check the browser console for errors
- Ensure the service is running
- Verify the endpoint URL is correct

## Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Scalar Documentation](https://github.com/scalar/scalar)
- [Campaign Service README](./README.md)
- [Local Testing Guide](./LOCAL_TESTING.md)

