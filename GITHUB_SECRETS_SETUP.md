# GitHub Secrets Configuration Guide

This guide helps you set up GitHub Secrets required for the CI/CD pipeline to deploy to Digital Ocean.

## Required Secrets

The following secrets must be added to your GitHub repository for the CD pipeline to work.

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. In left sidebar: **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret from the tables below

## Secrets List

### Infrastructure Secrets

| Secret Name | Description | Example Value | How to Get |
|-------------|-------------|---------------|------------|
| `DO_HOST` | Digital Ocean droplet IP address | `203.0.113.42` | Digital Ocean Console → Your Droplet → IP |
| `DO_SSH_PRIVATE_KEY` | SSH private key for deploy user | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` | `cat ~/.ssh/do_deploy` |

### Database & Message Broker

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@postgres:5432/care_for_all` |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://guest:guest@rabbitmq:5672` |

### Security

| Secret Name | Description | How to Generate |
|-------------|-------------|-----------------|
| `INTERNAL_SERVICE_SECRET` | Service-to-service authentication | `openssl rand -hex 32` |
| `JWT_SECRET` | JWT token signing key | `openssl rand -hex 32` |

### Application

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `APP_URL` | Public URL for your application | `http://203.0.113.42:8080` or `https://careforall.example.com` |

## Step-by-Step Setup

### Step 1: Generate SSH Key Pair

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/do_deploy

# Press Enter for no passphrase (required for automation)
```

This creates two files:
- `~/.ssh/do_deploy` - **Private key** (add to GitHub Secrets)
- `~/.ssh/do_deploy.pub` - **Public key** (add to droplet)

### Step 2: Add Public Key to Droplet

```bash
# Copy public key to droplet
ssh-copy-id -i ~/.ssh/do_deploy.pub deploy@<your-droplet-ip>

# Or manually:
cat ~/.ssh/do_deploy.pub
# Copy output, then:
ssh root@<droplet-ip>
echo "<paste-public-key-here>" >> /home/deploy/.ssh/authorized_keys
```

### Step 3: Get Private Key Content

```bash
# Display private key
cat ~/.ssh/do_deploy

# Copy ENTIRE output including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ... (multiple lines) ...
# -----END OPENSSH PRIVATE KEY-----
```

### Step 4: Add to GitHub Secrets

#### DO_HOST
```
Name: DO_HOST
Value: 203.0.113.42
```

#### DO_SSH_PRIVATE_KEY
```
Name: DO_SSH_PRIVATE_KEY
Value: (paste entire private key content)
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACDw...
(many more lines)
...
-----END OPENSSH PRIVATE KEY-----
```

#### INTERNAL_SERVICE_SECRET
```bash
# Generate
openssl rand -hex 32

# Example output: 5f4dcc3b5aa765d61d8327deb882cf99c1aad01e8f86c8d5f9e1c8a7b6d5e4f3

Name: INTERNAL_SERVICE_SECRET
Value: 5f4dcc3b5aa765d61d8327deb882cf99c1aad01e8f86c8d5f9e1c8a7b6d5e4f3
```

#### JWT_SECRET
```bash
# Generate
openssl rand -hex 32

Name: JWT_SECRET
Value: (paste generated value)
```

#### DATABASE_URL
```
Name: DATABASE_URL
Value: postgresql://postgres:postgres@postgres:5432/care_for_all

Note: Change username/password for production!
```

#### RABBITMQ_URL
```
Name: RABBITMQ_URL
Value: amqp://guest:guest@rabbitmq:5672

Note: Change credentials for production!
```

#### APP_URL
```
Name: APP_URL
Value: http://203.0.113.42:8080

Or for custom domain:
Value: https://careforall.example.com
```

## Verification

### Test SSH Connection

```bash
# Test connection using the deploy key
ssh -i ~/.ssh/do_deploy deploy@<droplet-ip>

# Should connect without password
# Exit: type 'exit'
```

### Check Secrets are Set

1. Go to repository **Settings**
2. **Secrets and variables** → **Actions**
3. Verify all 7 secrets are listed:
   - DO_HOST
   - DO_SSH_PRIVATE_KEY
   - DATABASE_URL
   - RABBITMQ_URL
   - INTERNAL_SERVICE_SECRET
   - JWT_SECRET
   - APP_URL

### Test CD Pipeline

```bash
# Trigger a manual deployment
# GitHub → Actions → CD - Continuous Deployment → Run workflow

# Or push to main
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "test: trigger CD"
git push
```

## Security Best Practices

### ⚠️ Important Security Notes

1. **Never commit secrets to git**
   - All secrets are in GitHub Secrets
   - `.env` files are in `.gitignore`

2. **Rotate secrets regularly**
   - Update every 90 days
   - Update immediately if compromised

3. **Use strong secrets**
   - Minimum 32 characters
   - Random generation (not dictionary words)

4. **Limit access**
   - Only necessary team members have access
   - Use separate secrets for staging/production

5. **Change default passwords**
   - PostgreSQL: `postgres:postgres` ❌
   - RabbitMQ: `guest:guest` ❌
   - Grafana: `admin:admin` ❌

### Production Secrets Checklist

Before going live:

- [ ] Generate new `INTERNAL_SERVICE_SECRET`
- [ ] Generate new `JWT_SECRET`
- [ ] Create strong database password
- [ ] Create strong RabbitMQ credentials
- [ ] Change Grafana admin password
- [ ] Use HTTPS for `APP_URL`
- [ ] Enable SSL/TLS for database
- [ ] Restrict SSH access by IP
- [ ] Enable 2FA on GitHub
- [ ] Set up secret scanning

## Troubleshooting

### Secret Not Found

**Error**: `Secret DO_HOST not found`

**Solution**:
1. Verify secret name is exactly `DO_HOST` (case-sensitive)
2. Check you're in the correct repository
3. Verify you have admin access to the repository

### SSH Connection Fails

**Error**: `Permission denied (publickey)`

**Solutions**:
```bash
# 1. Verify public key is on droplet
ssh deploy@<droplet-ip> cat ~/.ssh/authorized_keys

# 2. Check private key format
cat ~/.ssh/do_deploy
# Should start with: -----BEGIN OPENSSH PRIVATE KEY-----

# 3. Test SSH manually
ssh -i ~/.ssh/do_deploy deploy@<droplet-ip>
```

### Database Connection Fails

**Error**: `Connection refused` or `Authentication failed`

**Solutions**:
1. Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/database`
2. Check PostgreSQL is running: `docker compose ps postgres`
3. Test connection: `docker compose exec postgres psql -U postgres`

## Quick Reference

### Generate All Secrets at Once

```bash
#!/bin/bash
echo "Generating secrets for Care For All..."
echo ""
echo "INTERNAL_SERVICE_SECRET=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo ""
echo "Add these to GitHub Secrets!"
```

Save as `generate-secrets.sh`, run with: `bash generate-secrets.sh`

### Copy Template

Use this template when adding secrets:

```
DO_HOST=<your-droplet-ip>
DO_SSH_PRIVATE_KEY=<paste-private-key>
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/care_for_all
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
INTERNAL_SERVICE_SECRET=<generated-with-openssl>
JWT_SECRET=<generated-with-openssl>
APP_URL=http://<your-droplet-ip>:8080
```

## Support

If you encounter issues:
1. Review this guide
2. Check [CI_CD_SETUP.md](./CI_CD_SETUP.md)
3. Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
4. Check GitHub Actions logs
5. Check droplet logs: `ssh deploy@<ip> 'cd /opt/care-for-all/infra && docker compose logs'`

## Next Steps

After setting up secrets:

1. ✅ Push code to main branch
2. ✅ Watch CI pipeline run
3. ✅ Watch CD pipeline deploy
4. ✅ Access your deployed application
5. ✅ Monitor with observability stack

---

**Documentation**: [Full CI/CD Setup Guide](./CI_CD_SETUP.md)

