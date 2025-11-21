# Nginx Reverse Proxy Configuration

## Overview

Nginx acts as the single entry point for the Care For All platform, routing traffic to appropriate services.

## Routing Rules

### Public Routes

| Path | Target | Description |
|------|--------|-------------|
| `/` | admin-frontend:80 | Main application (SPA) |
| `/admin/*` | admin-frontend:80 | Admin panel routes |
| `/api/*` | gateway:3000 | API Gateway (strips `/api` prefix) |
| `/docs` | gateway:3000 | API documentation |
| `/openapi` | gateway:3000 | OpenAPI specification |
| `/health` | gateway:3000 | Health check endpoint |

### Routing Flow

```
Browser
  │
  ├─ GET /                  → Nginx → Admin Frontend (index.html)
  ├─ GET /admin/campaigns   → Nginx → Admin Frontend (SPA routing)
  ├─ GET /api/campaigns     → Nginx → Gateway → Campaign Service
  ├─ POST /api/donations    → Nginx → Gateway → Donation Service
  ├─ GET /docs              → Nginx → Gateway (Scalar API docs)
  └─ GET /health            → Nginx → Gateway
```

## Configuration Details

### Upstream Services

```nginx
upstream gateway {
    server gateway:3000;
}

upstream admin_frontend {
    server admin-frontend:80;
}
```

### API Proxy Configuration

```nginx
location /api/ {
    proxy_pass http://gateway/;  # Strips /api prefix
    
    # WebSocket support for chat service
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # Standard headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

**Example**:
- Request: `http://localhost/api/campaigns`
- Proxied to: `http://gateway:3000/campaigns`
- Gateway routes to: `http://campaign-service:3000/campaigns`

### Frontend (SPA) Configuration

```nginx
location / {
    proxy_pass http://admin_frontend;
    try_files $uri $uri/ /index.html;  # SPA fallback
}
```

This ensures all frontend routes (e.g., `/admin/campaigns`) are handled by the React SPA.

## Features

### 1. WebSocket Support

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

Enables WebSocket connections for the chat service:
- Client: `ws://localhost/api/chat/ws/:campaignId`
- Proxied to: Gateway → Chat Service

### 2. Compression

```nginx
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;
```

Reduces bandwidth by ~70% for text-based responses.

### 3. Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

Protects against common web vulnerabilities.

### 4. Static Asset Caching

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

Caches static assets for better performance.

## Testing

### Test Routing Locally

```bash
# Start services
cd infra
docker compose up -d

# Test API
curl http://localhost/api/campaigns

# Test health check
curl http://localhost/health

# Test docs
curl http://localhost/docs

# Test frontend
curl http://localhost/
```

### View Nginx Logs

```bash
# Access logs
docker compose logs nginx | grep access

# Error logs
docker compose logs nginx | grep error

# Follow logs
docker compose logs -f nginx
```

### Test WebSocket

```javascript
// In browser console
const ws = new WebSocket('ws://localhost/api/chat/ws/campaign_123');
ws.onmessage = (event) => console.log(event.data);
ws.send(JSON.stringify({ message: 'Hello!' }));
```

## Production Considerations

### Enable HTTPS

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... rest of config
}
```

### Add Rate Limiting

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        # ... proxy config
    }
}
```

### Add Load Balancing

```nginx
upstream gateway {
    least_conn;  # or ip_hash
    server gateway-1:3000;
    server gateway-2:3000;
    server gateway-3:3000;
}
```

## Troubleshooting

### 502 Bad Gateway

**Cause**: Backend service not responding

**Fix**:
```bash
# Check if gateway is running
docker compose ps gateway

# Check gateway logs
docker compose logs gateway

# Restart gateway
docker compose restart gateway
```

### 404 Not Found on SPA Routes

**Cause**: Missing `try_files` fallback

**Fix**: Already configured with `try_files $uri $uri/ /index.html;`

### CORS Issues

**Fix**: Add CORS headers in nginx
```nginx
add_header Access-Control-Allow-Origin "*" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
```

Or better: Handle CORS in the gateway service (already done via Hono).

## File Structure

```
infra/
├── nginx/
│   ├── nginx.conf          # Main nginx configuration
│   └── README.md           # This file
└── docker-compose.yml      # Nginx service definition
```

## Summary

The nginx layer provides:
- ✅ Single entry point (port 80)
- ✅ Clean URL routing (`/api`, `/admin`)
- ✅ WebSocket support
- ✅ Static asset optimization
- ✅ Security headers
- ✅ Production-ready foundation

**All traffic flows through nginx → Simplified deployment** 🚀

