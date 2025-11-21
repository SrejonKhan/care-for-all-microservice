# Scripts Directory

Utility scripts for Care For All platform.

## Available Scripts

### 1. setup-droplet.sh

**Purpose**: Automate Digital Ocean droplet setup for deployment

**Usage**:

```bash
# On your Digital Ocean droplet (as root)
wget https://raw.githubusercontent.com/<username>/care-for-all-microservice/main/scripts/setup-droplet.sh
sudo bash setup-droplet.sh
```

**What it does**:

- Installs Docker and Docker Compose
- Creates `deploy` user with Docker permissions
- Sets up deployment directory (`/opt/care-for-all`)
- Configures firewall (UFW)
- Installs useful utilities

**Time**: ~5 minutes

### 2. verify-deployment.sh

**Purpose**: Verify all services are healthy after deployment

**Usage**:

```bash
# Local deployment
./scripts/verify-deployment.sh

# Remote deployment
./scripts/verify-deployment.sh http://your-droplet-ip:8080

# From infra directory
cd infra
../scripts/verify-deployment.sh
```

**What it checks**:

- ✅ Gateway health
- ✅ Observability services (Grafana, Jaeger, Kibana, Prometheus)
- ✅ Infrastructure (RabbitMQ, cAdvisor)
- ✅ API documentation availability
- ✅ Docker container status

**Time**: ~30 seconds

## Creating New Scripts

When adding scripts:

1. Create in `scripts/` directory
2. Make executable: `chmod +x scripts/your-script.sh`
3. Add shebang: `#!/bin/bash`
4. Add description to this README
5. Handle errors with `set -e`
6. Add help text with `--help` flag

## Example Script Template

```bash
#!/bin/bash
# Description: What this script does
# Usage: ./script-name.sh [args]

set -e

# Help text
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [args]"
    echo "Description: What this does"
    exit 0
fi

# Script logic here
echo "Running script..."
```

## Troubleshooting

### Permission Denied

```bash
# Make script executable
chmod +x scripts/script-name.sh
```

### Script Not Found

```bash
# Run from repository root
cd /path/to/care-for-all-microservice
./scripts/script-name.sh
```

### Sudo Required

Some scripts require sudo (like `setup-droplet.sh`):

```bash
sudo bash scripts/setup-droplet.sh
```
