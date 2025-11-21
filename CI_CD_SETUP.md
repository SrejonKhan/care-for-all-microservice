# CI/CD Setup Guide for Care For All Platform

## Overview

This document explains the CI/CD pipeline setup for the Care For All donation platform, fulfilling **Checkpoint 4** of the hackathon requirements.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────────┐
│   GitHub    │ ───> │  CI Pipeline │ ───> │ Docker Registry  │
│  Repository │      │ (Actions)    │      │ (ghcr.io)        │
└─────────────┘      └──────────────┘      └──────────────────┘
                            │                        │
                            │                        ▼
                            │               ┌──────────────────┐
                            └─────────────> │  CD Pipeline     │
                                            │  (Deploy to DO)  │
                                            └──────────────────┘
                                                     │
                                                     ▼
                                            ┌──────────────────┐
                                            │ Digital Ocean    │
                                            │ Droplet          │
                                            │ (Production)     │
                                            └──────────────────┘
```

## CI Pipeline (`ci.yml`)

### Features

✅ **Intelligent Service Detection**: Uses `dorny/paths-filter` to detect which services changed
✅ **Parallel Testing**: Runs tests only for changed services in parallel
✅ **Incremental Builds**: Builds only affected services using Turborepo
✅ **Docker Image Building**: Builds and pushes Docker images with semantic versioning
✅ **Multi-stage Validation**: Lint → Test → Build → Docker
✅ **Branch Protection**: CI must pass before merging to main

### Pipeline Stages

1. **Detect Changes** (`detect-changes`)
   - Analyzes git diff to find changed services
   - Outputs list of affected services for subsequent jobs

2. **Lint & Type Check** (`lint-and-typecheck`)
   - Runs TypeScript type checking
   - Uses Turborepo filters for efficiency

3. **Test** (`test`)
   - Runs unit tests for each changed service in parallel
   - Matrix strategy for parallel execution

4. **Build** (`build`)
   - Compiles TypeScript for each changed service
   - Uploads build artifacts for inspection

5. **Docker Build** (`docker-build`)
   - Only runs on `main` and `develop` branches
   - Builds Docker images for changed services
   - Tags images with:
     - `latest`
     - Semantic version from `package.json` (e.g., `v1.0.2`)
     - Git commit SHA
   - Pushes to GitHub Container Registry

6. **CI Summary** (`ci-summary`)
   - Generates deployment report
   - Fails if any stage failed

### Triggering CI

CI runs automatically on:
- Push to `main` or `develop`
- Pull requests targeting `main` or `develop`

### Example CI Run

```bash
# Developer pushes changes to campaign-service
git add apps/backend/campaign-service/
git commit -m "feat(campaign): add pagination"
git push origin feature/campaign-pagination

# CI Pipeline Detects:
# - Only campaign-service changed
# - Runs tests ONLY for campaign-service
# - Builds ONLY campaign-service
# - Skips all other services ✨
```

## CD Pipeline (`cd.yml`)

### Features

✅ **Automated Deployment**: Deploys to Digital Ocean Droplet after CI passes
✅ **Health Checks**: Verifies services are running after deployment
✅ **Zero-Downtime**: Uses Docker Compose for rolling updates
✅ **Rollback Support**: Manual rollback workflow included
✅ **Environment Management**: Separate staging/production environments

### Pipeline Stages

1. **Deploy** (`deploy`)
   - Copies code to Digital Ocean droplet via SSH
   - Creates production environment file
   - Pulls latest Docker images
   - Stops old containers
   - Starts new containers with `docker compose up`
   - Waits for services to become healthy

2. **Health Check** (`health-check`)
   - Verifies gateway is responding
   - Checks observability stack (Grafana, Prometheus)

3. **Notify** (`notify`)
   - Creates deployment summary
   - Sends notifications on success/failure

4. **Rollback** (`rollback`)
   - Manual rollback capability
   - Restores previous Docker images

### Triggering CD

CD runs automatically:
- After successful CI run on `main` branch

Manual deployment:
- Via GitHub Actions UI (workflow_dispatch)

## Digital Ocean Setup

### Prerequisites

1. **Digital Ocean Droplet**
   - Ubuntu 22.04 LTS or newer
   - Minimum 4GB RAM, 2 vCPUs (8GB RAM, 4 vCPUs recommended)
   - 80GB SSD storage minimum

2. **Required Software on Droplet**
   ```bash
   # SSH into droplet
   ssh root@your-droplet-ip
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo apt-get update
   sudo apt-get install docker-compose-plugin
   
   # Create deploy user
   sudo useradd -m -s /bin/bash deploy
   sudo usermod -aG docker deploy
   sudo mkdir -p /opt/care-for-all
   sudo chown deploy:deploy /opt/care-for-all
   ```

3. **SSH Key Setup**
   ```bash
   # On your local machine, generate SSH key
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/do_deploy
   
   # Copy public key to droplet
   ssh-copy-id -i ~/.ssh/do_deploy.pub deploy@your-droplet-ip
   
   # Test connection
   ssh -i ~/.ssh/do_deploy deploy@your-droplet-ip
   ```

### GitHub Secrets Configuration

Add these secrets to your GitHub repository:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DO_HOST` | Digital Ocean droplet IP | `203.0.113.42` |
| `DO_SSH_PRIVATE_KEY` | Private SSH key content | Contents of `~/.ssh/do_deploy` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/db` |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://guest:guest@rabbitmq:5672` |
| `INTERNAL_SERVICE_SECRET` | Service-to-service auth | `generate-random-secret-here` |
| `JWT_SECRET` | JWT signing key | `generate-random-secret-here` |
| `APP_URL` | Public application URL | `https://careforall.example.com` |

### Adding Secrets in GitHub

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each secret from the table above

## Versioning Strategy

### Semantic Versioning

We follow [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** (v2.0.0): Breaking API changes
- **MINOR** (v1.1.0): New features, backward compatible
- **PATCH** (v1.0.1): Bug fixes, backward compatible

### Version Bumping

#### Manual Version Bump via GitHub Actions

1. Go to **Actions** → **Version Bump**
2. Click **Run workflow**
3. Select:
   - **Service**: Which service to bump (or "all")
   - **Bump type**: patch, minor, or major
4. Click **Run workflow**

This will:
- Update `package.json` version
- Create git tag (e.g., `campaign-service-v1.0.2`)
- Push changes to main
- Create GitHub release
- Trigger CI/CD pipeline

#### Manual Version Bump via CLI

```bash
# Bump patch version (1.0.0 → 1.0.1)
cd apps/backend/campaign-service
npm version patch

# Bump minor version (1.0.0 → 1.1.0)
npm version minor

# Bump major version (1.0.0 → 2.0.0)
npm version major

# Commit and push
git push origin main --tags
```

### Version Tags Format

- Service-specific: `<service-name>-v<version>`
  - Example: `campaign-service-v1.0.2`
  - Example: `gateway-v2.1.0`

- Docker image tags:
  - `latest` - Latest build from main
  - `v1.0.2` - Specific semantic version
  - `<commit-sha>` - Specific git commit

## Docker Registry

### GitHub Container Registry (ghcr.io)

Images are automatically pushed to:
```
ghcr.io/<username>/care-for-all-<service>:<tag>
```

### Pulling Images

```bash
# Pull latest
docker pull ghcr.io/yourusername/care-for-all-gateway:latest

# Pull specific version
docker pull ghcr.io/yourusername/care-for-all-gateway:v1.0.2

# Pull specific commit
docker pull ghcr.io/yourusername/care-for-all-gateway:a1b2c3d
```

## Deployment Workflow

### Automatic Deployment Flow

```
1. Developer pushes to main
   ↓
2. CI Pipeline runs
   ├─ Detect changes
   ├─ Run tests
   ├─ Build services
   └─ Push Docker images
   ↓
3. CD Pipeline triggers
   ├─ Copy files to droplet
   ├─ Create env file
   ├─ Pull Docker images
   ├─ Stop old containers
   ├─ Start new containers
   └─ Health checks
   ↓
4. Deployment complete ✅
```

### Manual Deployment

```bash
# Via GitHub Actions UI
1. Go to Actions → CD - Continuous Deployment
2. Click "Run workflow"
3. Select environment (production/staging)
4. Click "Run workflow"
```

## Monitoring Deployment

### View Logs in GitHub Actions

1. Go to **Actions** tab
2. Click on the running workflow
3. View logs for each job

### View Logs on Droplet

```bash
# SSH into droplet
ssh deploy@your-droplet-ip

# View service logs
cd /opt/care-for-all/infra
docker compose logs -f

# View specific service
docker compose logs -f gateway

# View last 100 lines
docker compose logs --tail=100 campaign-service
```

### Health Checks

```bash
# Check gateway
curl http://your-droplet-ip:8080/health

# Check all services
cd /opt/care-for-all/infra
docker compose ps
```

## Troubleshooting

### CI Pipeline Fails

```bash
# Check which services changed
# View "Detect Changes" job output

# Run locally
bun install
bun test
bun run build
```

### Deployment Fails

```bash
# SSH into droplet
ssh deploy@your-droplet-ip

# Check Docker logs
cd /opt/care-for-all/infra
docker compose logs

# Restart services
docker compose restart

# Full rebuild
docker compose down
docker compose up -d --build
```

### Rollback Deployment

```bash
# Option 1: Via GitHub Actions
1. Go to Actions → CD - Continuous Deployment
2. Find failed run
3. Re-run "Rollback" job

# Option 2: Manual rollback on droplet
ssh deploy@your-droplet-ip
cd /opt/care-for-all/infra
docker compose down
# Restore previous code or use previous Docker images
docker compose up -d
```

## Best Practices

### Before Merging to Main

1. ✅ Create feature branch
2. ✅ Push to feature branch
3. ✅ Create Pull Request
4. ✅ Wait for CI to pass
5. ✅ Get code review
6. ✅ Merge to main (triggers deployment)

### Version Bumping

- **Patch**: Bug fixes, small changes
- **Minor**: New features, no breaking changes
- **Major**: Breaking changes, API changes

### Environment Variables

- Never commit secrets to git
- Use GitHub Secrets for sensitive data
- Document all required environment variables

## Compliance with Hackathon Requirements

### ✅ Checkpoint 4 Requirements Met

| Requirement | Implementation |
|-------------|----------------|
| CI/CD pipeline | ✅ GitHub Actions workflows (ci.yml, cd.yml) |
| Automatic tests on PR/push | ✅ CI runs on every PR and push |
| No merge without CI passing | ✅ Enforced via workflow status checks |
| Intelligent service detection | ✅ Only changed services are tested/built |
| Proper versioning | ✅ Semantic versioning in package.json |
| Tagged Docker images | ✅ Images tagged with version + SHA |
| **Bonus**: Automated deployment | ✅ CD pipeline deploys to Digital Ocean |

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Digital Ocean Droplet Setup](https://docs.digitalocean.com/products/droplets/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Semantic Versioning](https://semver.org/)

## Support

For issues or questions:
1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Check service logs on droplet
4. Contact DevOps team

