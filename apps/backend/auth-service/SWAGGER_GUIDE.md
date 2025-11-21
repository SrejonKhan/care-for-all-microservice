# Swagger/OpenAPI Documentation Guide

The Auth Service comes with **interactive API documentation** powered by [Scalar](https://scalar.com/) - a modern, beautiful alternative to Swagger UI.

## 🚀 Quick Access

### Local Development

Start the service:
```bash
bun run dev
```

Then open in your browser:

**📚 Interactive API Documentation (Scalar UI)**
```
http://localhost:3000/docs
```

**📄 OpenAPI JSON Specification**
```
http://localhost:3000/openapi
```

## 🎨 Features

### Scalar UI Features

- ✅ **Beautiful Interface** - Modern, clean design
- ✅ **Try It Out** - Test endpoints directly from the browser
- ✅ **Authentication** - Built-in auth token management
- ✅ **Request/Response Examples** - See examples for all endpoints
- ✅ **Schema Validation** - Real-time validation of request bodies
- ✅ **Code Generation** - Generate client code in multiple languages
- ✅ **Search** - Quickly find endpoints
- ✅ **Dark Mode** - Easy on the eyes

### OpenAPI 3.1 Features

- ✅ **Type-Safe Schemas** - Zod schemas converted to OpenAPI
- ✅ **Automatic Validation** - Request/response validation
- ✅ **Tagged Endpoints** - Organized by category
- ✅ **Security Schemes** - JWT Bearer authentication
- ✅ **Multiple Servers** - Local and Docker configurations

## 📖 Using the Documentation

### 1. Browse Endpoints

The documentation is organized into sections:

- **Authentication** - Register, login, guest users, token management
- **User** - Profile management, user listing
- **Admin** - Admin-only endpoints

### 2. Test an Endpoint

**Example: Register a User**

1. Navigate to `http://localhost:3000/docs`
2. Find the `POST /register` endpoint
3. Click "Try it out"
4. Fill in the request body:
   ```json
   {
     "email": "test@example.com",
     "password": "password123",
     "name": "Test User"
   }
   ```
5. Click "Execute"
6. View the response with your access token

### 3. Use Authentication

**For Protected Endpoints:**

1. First, register or login to get an access token
2. Copy the `accessToken` from the response
3. Click the "Authorize" button at the top
4. Enter: `Bearer YOUR_ACCESS_TOKEN`
5. Click "Authorize"
6. Now you can test protected endpoints like `GET /me`

### 4. Test Different Scenarios

**Success Case:**
```json
// POST /register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Validation Error:**
```json
// POST /register (invalid email)
{
  "email": "invalid-email",
  "password": "password123",
  "name": "John Doe"
}
```

**Short Password:**
```json
// POST /register (password too short)
{
  "email": "user@example.com",
  "password": "123",
  "name": "John Doe"
}
```

## 📋 All Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/docs` | Swagger documentation |
| GET | `/openapi` | OpenAPI specification |
| POST | `/register` | Register new user |
| POST | `/login` | Login user |
| POST | `/guest` | Create guest user |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout (revoke token) |
| POST | `/verify-token` | Verify JWT token |

### Protected Endpoints (Auth Required)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/me` | Get current user profile | Any |
| PATCH | `/me` | Update user profile | Any |
| POST | `/guest/claim` | Claim guest account | Guest |

### Admin Endpoints (Admin Role Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users (paginated) |
| PATCH | `/users/:id/role` | Update user role |
| GET | `/users/stats` | Get user statistics |

## 🔐 Authentication Flow

### 1. Register/Login Flow

```
1. POST /register or POST /login
   ↓
2. Receive accessToken and refreshToken
   ↓
3. Use accessToken in Authorization header
   ↓
4. When accessToken expires (15 min)
   ↓
5. POST /refresh with refreshToken
   ↓
6. Receive new tokens
```

### 2. Guest Flow

```
1. POST /guest
   ↓
2. Receive guest accessToken
   ↓
3. Make donations (in other services)
   ↓
4. POST /guest/claim with email/password
   ↓
5. Guest account converted to registered user
   ↓
6. All previous donations linked to account
```

## 💡 Tips & Tricks

### 1. Save Tokens

After registering/logging in, save the tokens:

```bash
# In browser console
localStorage.setItem('accessToken', 'YOUR_TOKEN');
localStorage.setItem('refreshToken', 'YOUR_REFRESH_TOKEN');
```

### 2. Auto-Refresh Tokens

The Scalar UI doesn't auto-refresh tokens. When you get a 401 error:

1. Use the `/refresh` endpoint
2. Copy the new `accessToken`
3. Update the Authorization header

### 3. Test Error Cases

Try these to see error responses:

- **Invalid email format**: `"email": "not-an-email"`
- **Short password**: `"password": "123"`
- **Missing fields**: Remove required fields
- **Duplicate email**: Register same email twice
- **Wrong password**: Login with wrong password
- **Expired token**: Wait 15 minutes and use old token
- **Invalid token**: Use a random string as token

### 4. Export OpenAPI Spec

Download the OpenAPI specification:

```bash
curl http://localhost:3000/openapi > openapi.json
```

Use it to:
- Import into Postman
- Generate client SDKs
- Share with frontend team
- Generate documentation

### 5. Generate Client Code

In Scalar UI:
1. Click on any endpoint
2. Look for "Code Examples" or "Client" tab
3. Select your language (cURL, JavaScript, Python, etc.)
4. Copy the generated code

## 🎯 Common Use Cases

### Use Case 1: Test User Registration

```bash
# 1. Open http://localhost:3000/docs
# 2. Find POST /register
# 3. Click "Try it out"
# 4. Use this body:
{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "name": "New User"
}
# 5. Click Execute
# 6. Copy the accessToken from response
```

### Use Case 2: Test Protected Endpoint

```bash
# 1. Get token from registration/login
# 2. Click "Authorize" button
# 3. Enter: Bearer YOUR_TOKEN
# 4. Click "Authorize"
# 5. Try GET /me
# 6. See your user profile
```

### Use Case 3: Test Token Refresh

```bash
# 1. Login to get tokens
# 2. Copy refreshToken
# 3. Find POST /refresh
# 4. Use body:
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
# 5. Get new tokens
```

### Use Case 4: Test Guest User

```bash
# 1. POST /guest with:
{
  "name": "Guest User"
}
# 2. Get guest token
# 3. Use token for donations
# 4. POST /guest/claim with:
{
  "email": "guest@example.com",
  "password": "password123"
}
# 5. Guest becomes registered user
```

### Use Case 5: Test Admin Endpoints

```bash
# 1. Register a user
# 2. Manually set role to ADMIN in MongoDB:
mongosh
use care_for_all_dev
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "ADMIN" } }
)
# 3. Login again to get admin token
# 4. Test GET /users
# 5. Test PATCH /users/:id/role
# 6. Test GET /users/stats
```

## 🔧 Customization

The OpenAPI documentation is defined in `src/index.ts`:

```typescript
app.doc('/openapi', {
  openapi: '3.1.0',
  info: {
    title: 'Auth Service API',
    version: '1.0.0',
    description: 'Authentication and authorization service',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
});
```

## 📱 Mobile Testing

You can also test from mobile devices:

1. Find your local IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
2. Access: `http://YOUR_IP:3000/docs`
3. Make sure your firewall allows connections

## 🐛 Troubleshooting

### Issue: Documentation not loading

**Solution:**
```bash
# Check if service is running
curl http://localhost:3000/health

# Restart service
bun run dev
```

### Issue: Can't test protected endpoints

**Solution:**
1. Make sure you're authenticated
2. Check if token is expired (15 min expiry)
3. Use `/refresh` to get new token
4. Update Authorization header

### Issue: CORS errors

**Solution:**
CORS is enabled in development mode. If you still have issues:
1. Check `src/index.ts` CORS configuration
2. Make sure `NODE_ENV=development`

### Issue: Validation errors

**Solution:**
1. Check the schema in the documentation
2. Make sure all required fields are present
3. Check data types (string, number, etc.)
4. Check format (email, min length, etc.)

## 📚 Additional Resources

- **Scalar Documentation**: https://scalar.com/
- **OpenAPI Specification**: https://spec.openapis.org/oas/v3.1.0
- **Zod Documentation**: https://zod.dev/
- **Hono Documentation**: https://hono.dev/

## 🎉 Happy Testing!

The Swagger documentation makes it easy to:
- ✅ Explore all available endpoints
- ✅ Test endpoints without writing code
- ✅ See request/response examples
- ✅ Validate your API design
- ✅ Share API documentation with team

Open `http://localhost:3000/docs` and start testing! 🚀

