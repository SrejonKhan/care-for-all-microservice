# Nginx Reverse Proxy Layer - Implementation Summary

## Overview

Added nginx as a reverse proxy layer to provide a single entry point for the entire Care For All platform.

## Architecture

```
                    ┌─────────────────┐
                    │     Nginx       │ :80
                    │ (Reverse Proxy) │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
     ┌──────────┐    ┌──────────┐    ┌──────────┐
     │   /*     │    │  /api/*  │    │  /docs   │
     │  /admin  │    │          │    │ /health  │
     └────┬─────┘    └────┬─────┘    └────┬─────┘
          │               │               │
          ▼               ▼               ▼
   ┌────────────┐   ┌──────────┐   ┌──────────┐
   │  Frontend  │   │ Gateway  │   │ Gateway  │
   │  (Next.js) │   │  :3000   │   │  :3000   │
   └────────────┘   └────┬─────┘   └──────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Campaign │   │Donation  │   │ Payment  │
    │ Service  │   │ Service  │   │ Service  │
    └──────────┘   └──────────┘   └──────────┘
```

## Routing Configuration

### Frontend Routes

| Path | Target | Description |
|------|--------|-------------|
| `/` | frontend:3000 | Home page |
| `/auth` | frontend:3000 | Login/Register |
| `/dashboard` | frontend:3000 | User dashboard |
| `/campaigns` | frontend:3000 | Campaign browsing |
| `/admin/*` | frontend:3000 | Admin panel |
| `/_next/*` | frontend:3000 | Next.js static files |

### API Routes

| Path | Target | Description |
|------|--------|-------------|
| `/api/*` | gateway:3000 | API Gateway (prefix stripped) |
| `/docs` | gateway:3000 | Scalar API documentation |
| `/openapi` | gateway:3000 | OpenAPI spec |
| `/health` | gateway:3000 | Health check |

### Routing Examples

**Frontend Requests**:
```
http://localhost/              → frontend:3000/
http://localhost/auth          → frontend:3000/auth
http://localhost/admin/campaigns → frontend:3000/admin/campaigns
http://localhost/_next/static/... → frontend:3000/_next/static/...
```

**API Requests**:
```
http://localhost/api/campaigns
  → nginx strips /api
  → gateway:3000/campaigns
  → campaign-service:3000/campaigns

http://localhost/api/donations
  → nginx strips /api
  → gateway:3000/donations
  → donation-service:3000/donations
```

## Changes Made

### 1. Created Nginx Configuration

**File**: `infra/nginx/nginx.conf`

**Features**:
- ✅ Upstream definitions for gateway and frontend
- ✅ API route proxying with `/api` prefix stripping
- ✅ Frontend SPA routing support
- ✅ WebSocket support for chat service
- ✅ Static asset caching
- ✅ Security headers
- ✅ Gzip compression

### 2. Updated Docker Compose

**File**: `infra/docker-compose.yml`

**Changes**:
- ✅ Added `nginx` service (port 80)
- ✅ Added `frontend` service (Next.js app)
- ✅ Removed port mapping from `gateway` (now internal only)
- ✅ Configured dependencies (nginx → gateway + frontend)

### 3. Created Frontend Dockerfile

**File**: `apps/frontend/Dockerfile`

**Features**:
- ✅ Multi-stage build for Next.js
- ✅ Standalone output mode
- ✅ Production optimizations

### 4. Updated Next.js Configuration

**File**: `apps/frontend/next.config.ts`

**Changes**:
- ✅ Enabled `output: 'standalone'` for Docker
- ✅ Added API rewrites for development

### 5. Updated Documentation

**Files Updated**:
- ✅ `README.md` - Updated access URLs
- ✅ `infra/README.md` - Updated service ports
- ✅ `infra/nginx/README.md` - Nginx documentation

## Port Changes

### Before (Multiple Exposed Ports)

```
Port 8080 → Gateway
Port 3002 → Admin Frontend
Port 3001 → Grafana
Port 16686 → Jaeger
Port 5601 → Kibana
...
```

### After (Single Entry Point + Observability)

```
Port 80 → Nginx (Main entry - routes to all services)
  ├─ / → Frontend
  ├─ /api → Gateway
  └─ /docs → Gateway

Port 3001 → Grafana (Direct access for monitoring)
Port 16686 → Jaeger (Direct access for tracing)
Port 5601 → Kibana (Direct access for logs)
Port 9090 → Prometheus (Direct access for metrics)
Port 15672 → RabbitMQ (Direct access for queue management)
```

## Benefits

### 1. Single Entry Point
- Users only need to know: `http://localhost`
- No port numbers needed for main application

### 2. Clean URLs
```
Before: http://localhost:8080/api/campaigns
After:  http://localhost/api/campaigns
```

### 3. Security
- Backend services not directly exposed
- All traffic goes through nginx
- Easy to add authentication, rate limiting, etc.

### 4. Flexibility
- Easy to add SSL/TLS termination
- Can add caching layer
- Can add WAF (Web Application Firewall)

### 5. Production Ready
- Standard nginx configuration
- Works with any orchestrator (Docker, K8s)
- Easy to scale (multiple nginx instances)

## Usage

### Access the Platform

```bash
# Start everything
cd infra
docker compose up -d

# Access via nginx
http://localhost           # Frontend home page
http://localhost/auth      # Login page
http://localhost/admin     # Admin panel
http://localhost/api/campaigns  # API endpoint
http://localhost/docs      # API documentation
```

### Development Mode

Frontend can still run locally:

```bash
# Run frontend locally (bypasses nginx)
cd apps/frontend
npm run dev
# Access at: http://localhost:3001
# API calls go to: http://localhost/api (via nginx)
```

## Testing

### Test Routing

```bash
# Test frontend
curl http://localhost/

# Test API (via nginx)
curl http://localhost/api/campaigns

# Test health check
curl http://localhost/health

# Test docs
curl http://localhost/docs
```

### Verify Nginx Configuration

```bash
# Check nginx config syntax
docker compose exec nginx nginx -t

# Reload nginx (if config changed)
docker compose exec nginx nginx -s reload

# View nginx logs
docker compose logs nginx
```

## Troubleshooting

### 502 Bad Gateway

**Cause**: Backend service not running

**Fix**:
```bash
docker compose ps  # Check service status
docker compose logs gateway  # Check gateway logs
docker compose restart gateway
```

### 404 Not Found on Frontend Routes

**Cause**: Next.js not handling SPA routing

**Fix**: Ensure Next.js rewrites are configured in `next.config.ts`

### API Calls Fail

**Cause**: Nginx not stripping `/api` prefix correctly

**Fix**: Check nginx.conf has `proxy_pass http://gateway/;` (trailing slash is important!)

## Configuration Files

```
infra/
├── nginx/
│   ├── nginx.conf          # Main nginx configuration
│   └── README.md          # This file
├── docker-compose.yml      # nginx service definition
```

## Future Enhancements

### SSL/TLS
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
}
```

### Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
location /api/ {
    limit_req zone=api burst=20 nodelay;
}
```

### Caching
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;
location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
}
```

---

**Status**: Nginx layer successfully added ✅
**Impact**: Cleaner architecture, single entry point, production-ready routing

