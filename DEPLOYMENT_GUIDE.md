# Deployment Guide - Digital Ocean Droplet

This guide walks you through deploying the Care For All platform to a Digital Ocean droplet.

## Prerequisites

- Digital Ocean account
- GitHub account with repository access
- Local terminal with SSH

## Step 1: Create Digital Ocean Droplet

### Via Digital Ocean Console

1. **Log in** to Digital Ocean
2. Click **Create** → **Droplets**
3. **Choose configuration**:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: 
     - Basic: $24/month (4GB RAM, 2 vCPUs) - Minimum
     - Recommended: $48/month (8GB RAM, 4 vCPUs)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH Key (recommended) or Password

4. **Create droplet** and wait for it to be ready
5. **Note the IP address** (e.g., `203.0.113.42`)

### Via DigitalOcean CLI (doctl)

```bash
# Install doctl
brew install doctl  # macOS
# or: snap install doctl  # Linux

# Authenticate
doctl auth init

# Create droplet
doctl compute droplet create care-for-all-prod \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb \
  --region nyc3 \
  --ssh-keys <your-ssh-key-id>

# Get droplet IP
doctl compute droplet list
```

## Step 2: Initial Droplet Setup

### Connect to Droplet

```bash
# SSH as root
ssh root@<your-droplet-ip>
```

### Run Setup Script

```bash
# Download and run setup script
wget https://raw.githubusercontent.com/<username>/care-for-all-microservice/main/scripts/setup-droplet.sh
sudo bash setup-droplet.sh
```

**Or manually copy and run:**

```bash
# Copy setup script from your local machine
scp scripts/setup-droplet.sh root@<droplet-ip>:/tmp/
ssh root@<droplet-ip>
sudo bash /tmp/setup-droplet.sh
```

The script will:
- ✅ Install Docker and Docker Compose
- ✅ Create `deploy` user
- ✅ Set up deployment directory (`/opt/care-for-all`)
- ✅ Configure firewall
- ✅ Install utilities

## Step 3: SSH Key Setup for GitHub Actions

### Generate SSH Key (on your local machine)

```bash
# Generate new SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/do_deploy

# This creates:
# - Private key: ~/.ssh/do_deploy
# - Public key: ~/.ssh/do_deploy.pub
```

### Add Public Key to Droplet

```bash
# Copy public key to droplet
ssh-copy-id -i ~/.ssh/do_deploy.pub deploy@<droplet-ip>

# Or manually:
cat ~/.ssh/do_deploy.pub
# Copy the output, then SSH to droplet:
ssh root@<droplet-ip>
echo "ssh-ed25519 AAAA..." >> /home/deploy/.ssh/authorized_keys
```

### Test SSH Connection

```bash
# Test connection with deploy user
ssh -i ~/.ssh/do_deploy deploy@<droplet-ip>

# Should connect without password
# Exit: exit
```

## Step 4: Configure GitHub Secrets

### Get Private Key Content

```bash
# Display private key content
cat ~/.ssh/do_deploy

# Copy the entire output (including BEGIN/END lines)
```

### Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:

#### Required Secrets

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `DO_HOST` | `203.0.113.42` | Your droplet IP address |
| `DO_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Content of `~/.ssh/do_deploy` |
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/care_for_all` | Use default or your own |
| `RABBITMQ_URL` | `amqp://guest:guest@rabbitmq:5672` | Use default or your own |
| `INTERNAL_SERVICE_SECRET` | Generate random | `openssl rand -hex 32` |
| `JWT_SECRET` | Generate random | `openssl rand -hex 32` |
| `APP_URL` | `http://203.0.113.42:8080` | Your droplet IP + port |

#### Generate Random Secrets

```bash
# Generate INTERNAL_SERVICE_SECRET
openssl rand -hex 32

# Generate JWT_SECRET
openssl rand -hex 32
```

## Step 5: Initial Manual Deployment (Optional)

Before setting up automated CD, you can test deployment manually:

```bash
# 1. SSH to droplet
ssh deploy@<droplet-ip>

# 2. Clone repository
cd /opt/care-for-all
git clone https://github.com/<username>/care-for-all-microservice.git .

# 3. Create environment file
nano .env.production
# Add all environment variables

# 4. Start services
cd infra
docker compose --env-file ../.env.production up -d --build

# 5. Check status
docker compose ps

# 6. View logs
docker compose logs -f
```

## Step 6: Test Automated Deployment

### Trigger CD Pipeline

```bash
# Option 1: Push to main
git checkout main
git pull
echo "test" >> README.md
git add README.md
git commit -m "test: trigger CD"
git push

# Option 2: Via GitHub UI
# Go to Actions → CD → Run workflow
```

### Monitor Deployment

1. Go to **GitHub Actions** tab
2. Click on the running **CD** workflow
3. Watch the deployment steps:
   - ✅ Copy files
   - ✅ Pull images
   - ✅ Start containers
   - ✅ Health checks

### Verify Deployment

```bash
# Check if gateway is responding
curl http://<droplet-ip>:8080/health

# Should return:
{
  "status": "healthy",
  "service": "gateway",
  "version": "1.0.0",
  ...
}
```

## Step 7: Access Your Deployed Platform

### Application URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Gateway API | `http://<droplet-ip>:8080` | - |
| API Documentation | `http://<droplet-ip>:8080/docs` | - |
| Admin Panel | `http://<droplet-ip>:3002` | - |
| Grafana | `http://<droplet-ip>:3001` | admin/admin |
| Jaeger | `http://<droplet-ip>:16686` | - |
| Kibana | `http://<droplet-ip>:5601` | - |
| Prometheus | `http://<droplet-ip>:9090` | - |
| RabbitMQ UI | `http://<droplet-ip>:15672` | guest/guest |

### Test the Platform

```bash
# Create a campaign
curl -X POST http://<droplet-ip>:8080/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Campaign",
    "description": "This is a test campaign",
    "goalAmount": 10000,
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  }'

# Get campaign
curl http://<droplet-ip>:8080/api/campaigns/<campaign-id>
```

## Monitoring & Maintenance

### View Service Status

```bash
ssh deploy@<droplet-ip>
cd /opt/care-for-all/infra
docker compose ps
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f gateway

# Last 100 lines
docker compose logs --tail=100
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart gateway
```

### Update Services

```bash
# Pull latest changes (automatically done by CD)
cd /opt/care-for-all
git pull

# Rebuild and restart
cd infra
docker compose up -d --build
```

## Troubleshooting

### Deployment Fails

**Problem**: SSH connection fails

```bash
# Check SSH key is added to GitHub Secrets
# Test SSH manually:
ssh -i ~/.ssh/do_deploy deploy@<droplet-ip>
```

**Problem**: Docker Compose fails to start

```bash
# SSH to droplet and check logs
ssh deploy@<droplet-ip>
cd /opt/care-for-all/infra
docker compose logs
```

**Problem**: Services not healthy

```bash
# Check individual service health
docker compose exec gateway curl http://localhost:3000/health

# Check resource usage
docker stats

# Check available disk
df -h
```

### CI Pipeline Fails

**Problem**: Tests fail

```bash
# Run tests locally
cd apps/backend/<service>
bun test

# Check error messages in GitHub Actions logs
```

**Problem**: Build fails

```bash
# Run build locally
cd apps/backend/<service>
bun run build

# Check TypeScript errors
```

### Roll Back Deployment

```bash
# Option 1: Re-run previous successful deployment
# GitHub Actions → CD → Previous successful run → Re-run

# Option 2: Manual rollback on droplet
ssh deploy@<droplet-ip>
cd /opt/care-for-all
git log --oneline -10
git checkout <previous-commit-sha>
cd infra
docker compose up -d --build
```

## Security Considerations

### Production Checklist

Before going to production:

- [ ] Change all default passwords
  - [ ] PostgreSQL: Update in `docker-compose.yml`
  - [ ] RabbitMQ: Update in `docker-compose.yml`
  - [ ] Grafana: Update in `docker-compose.yml`

- [ ] Generate strong secrets
  - [ ] `INTERNAL_SERVICE_SECRET`
  - [ ] `JWT_SECRET`

- [ ] Enable HTTPS
  - [ ] Install Nginx as reverse proxy
  - [ ] Get SSL certificate (Let's Encrypt)
  - [ ] Configure SSL termination

- [ ] Harden SSH
  - [ ] Disable password auth
  - [ ] Change SSH port
  - [ ] Enable fail2ban

- [ ] Configure firewall
  - [ ] Only expose necessary ports
  - [ ] Restrict SSH to specific IPs

- [ ] Set up monitoring alerts
  - [ ] Disk space alerts
  - [ ] Memory alerts
  - [ ] Service down alerts

### Environment Variables Security

```bash
# On droplet, ensure .env files have restricted permissions
chmod 600 /opt/care-for-all/.env.production

# Never commit .env files to git
# They are in .gitignore
```

## Scaling Considerations

### Horizontal Scaling

If traffic increases:

```bash
# Scale specific service
docker compose up -d --scale campaign-service=3

# Add load balancer (Nginx)
# Configure in docker-compose.yml
```

### Vertical Scaling

Upgrade droplet:
1. Digital Ocean Console → Resize Droplet
2. Choose larger plan
3. Wait for resize
4. Restart services

## Cost Estimation

### Digital Ocean Droplet Costs

| Configuration | Monthly Cost | Use Case |
|--------------|--------------|----------|
| 2GB RAM, 1 vCPU | $12 | Development |
| 4GB RAM, 2 vCPUs | $24 | Small production |
| 8GB RAM, 4 vCPUs | $48 | **Recommended** |
| 16GB RAM, 8 vCPUs | $96 | High traffic |

### Additional Costs

- Backups: +20% of droplet cost
- Load Balancer: ~$12/month (optional)
- Block Storage: ~$10/100GB (optional)

## Backup Strategy

### Manual Backup

```bash
# Backup database
ssh deploy@<droplet-ip>
docker compose exec postgres pg_dump -U postgres care_for_all > backup.sql

# Backup volumes
docker compose down
tar -czf backup-volumes.tar.gz /var/lib/docker/volumes/

# Copy to local
scp deploy@<droplet-ip>:backup.sql ./
```

### Automated Backups

Enable Digital Ocean automated backups:
- Droplet Settings → Enable Backups
- Runs weekly
- Keeps 4 most recent backups

## Monitoring URLs (Post-Deployment)

Once deployed, access monitoring at:

```
http://<droplet-ip>:3001  - Grafana (Metrics & Dashboards)
http://<droplet-ip>:16686 - Jaeger (Distributed Tracing)
http://<droplet-ip>:5601  - Kibana (Logs & Events)
http://<droplet-ip>:9090  - Prometheus (Raw Metrics)
```

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Check service logs on droplet
3. Review this guide
4. Check CI_CD_SETUP.md for detailed troubleshooting

## Summary

This deployment guide provides:
✅ Step-by-step Digital Ocean setup
✅ Automated deployment via CD pipeline
✅ Manual deployment instructions
✅ Troubleshooting guidance
✅ Security best practices
✅ Scaling strategies

**Total Setup Time**: ~30 minutes for first deployment

