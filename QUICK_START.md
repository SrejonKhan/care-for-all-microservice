# Care For All - Quick Start Guide

## 🚀 Start the Platform (One Command)

```bash
cd infra
docker compose up -d --build
```

## 🌐 Access the Platform

### Main Application

| URL | Description |
|-----|-------------|
| **http://localhost** | Home page & Frontend |
| **http://localhost/auth** | Login/Register |
| **http://localhost/dashboard** | User dashboard |
| **http://localhost/admin** | Admin panel |
| **http://localhost/campaigns** | Browse campaigns |

### API & Documentation

| URL | Description |
|-----|-------------|
| **http://localhost/api** | API Gateway |
| **http://localhost/docs** | Interactive API Docs (Scalar) |
| **http://localhost/health** | Health Check |

### Observability Stack

| URL | Description | Credentials |
|-----|-------------|-------------|
| **http://localhost:3001** | Grafana (Metrics) | admin/admin |
| **http://localhost:16686** | Jaeger (Tracing) | - |
| **http://localhost:5601** | Kibana (Logs) | - |
| **http://localhost:9090** | Prometheus (Metrics) | - |
| **http://localhost:15672** | RabbitMQ UI | guest/guest |

## 📝 Common Tasks

### View Service Status

```bash
cd infra
docker compose ps
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f gateway

# Frontend logs
docker compose logs -f frontend

# Nginx logs
docker compose logs -f nginx
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart gateway
```

### Stop Platform

```bash
cd infra
docker compose down
```

### Rebuild After Code Changes

```bash
cd infra
docker compose up -d --build
```

## 🧪 Test the API

### Create a Campaign

```bash
curl -X POST http://localhost/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Winter Relief Fund",
    "description": "Help families this winter",
    "goalAmount": 50000,
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  }'
```

### List Campaigns

```bash
curl http://localhost/api/campaigns
```

### Check Health

```bash
curl http://localhost/health
```

## 📊 Architecture Flow

```
Browser (http://localhost)
        │
        ▼
   ┌─────────┐
   │  Nginx  │ :80
   └────┬────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
Frontend   Gateway
(Next.js)  :3000
           │
      ┌────┼────┐
      │    │    │
      ▼    ▼    ▼
   Auth Campaign Donation
  Service Service Service
```

## 🔧 Development Workflow

### Run Locally (Without Docker)

```bash
# Terminal 1: Start infrastructure
cd infra
docker compose up postgres rabbitmq

# Terminal 2: Run a microservice
cd apps/backend/campaign-service
bun run dev

# Terminal 3: Run frontend
cd apps/frontend
npm run dev
```

### Hot Reload in Docker

```bash
# Use docker compose watch (Docker Compose v2.22+)
cd infra
docker compose watch
```

## ⚡ Quick Reference

| Task | Command |
|------|---------|
| Start all | `cd infra && docker compose up -d` |
| Stop all | `cd infra && docker compose down` |
| View logs | `docker compose logs -f` |
| Restart | `docker compose restart` |
| Rebuild | `docker compose up -d --build` |
| Status | `docker compose ps` |

## 🎯 Next Steps

1. ✅ Platform is running
2. 📱 Access http://localhost to see frontend
3. 📚 Visit http://localhost/docs for API documentation
4. 📊 Open http://localhost:3001 for Grafana dashboards
5. 🔍 Open http://localhost:16686 for distributed tracing

## 🆘 Need Help?

- 📖 [README.md](./README.md) - Full documentation
- 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- 🚀 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment guide
- 🔧 [infra/nginx/README.md](./infra/nginx/README.md) - Nginx configuration

---

**All services accessible through http://localhost** 🎉

