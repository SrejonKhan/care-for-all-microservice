#!/bin/bash

# Digital Ocean Droplet Setup Script for Care For All Platform
# Run this script on your fresh Ubuntu 22.04 droplet

set -e

echo "=================================="
echo "Care For All - Droplet Setup"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "Please run as root (use: sudo bash setup-droplet.sh)"
   exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "📦 Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Create deploy user
echo "👤 Creating deploy user..."
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    echo "✅ Deploy user created"
else
    echo "✅ Deploy user already exists"
fi

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p /opt/care-for-all
chown deploy:deploy /opt/care-for-all
echo "✅ Deployment directory created"

# Setup SSH for deploy user
echo "🔑 Setting up SSH for deploy user..."
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

echo ""
echo "⚠️  IMPORTANT: Add your GitHub Actions public SSH key to:"
echo "   /home/deploy/.ssh/authorized_keys"
echo ""
echo "   Example:"
echo "   echo 'ssh-ed25519 AAAA...' >> /home/deploy/.ssh/authorized_keys"
echo ""

# Install useful utilities
echo "🛠️  Installing utilities..."
apt-get install -y curl wget git htop vim

# Configure firewall
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    ufw allow 8080/tcp # Gateway
    ufw allow 3001/tcp # Grafana
    ufw allow 3002/tcp # Admin Frontend
    ufw allow 9090/tcp # Prometheus
    ufw allow 16686/tcp # Jaeger
    ufw allow 5601/tcp # Kibana
    echo "✅ Firewall configured"
fi

# Enable Docker service
echo "🚀 Enabling Docker service..."
systemctl enable docker
systemctl start docker

# Test Docker
echo "🧪 Testing Docker..."
docker run --rm hello-world > /dev/null 2>&1 && echo "✅ Docker working correctly"

# Display system info
echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "System Information:"
echo "-----------------------------------"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker compose version)"
echo "Disk: $(df -h / | awk 'NR==2 {print $4}') free"
echo "RAM: $(free -h | awk 'NR==2 {print $7}') available"
echo ""
echo "Deployment Path: /opt/care-for-all"
echo "Deploy User: deploy"
echo ""
echo "🔐 Next Steps:"
echo "1. Add GitHub Actions SSH public key to /home/deploy/.ssh/authorized_keys"
echo "2. Configure GitHub Secrets (see CI_CD_SETUP.md)"
echo "3. Test SSH connection: ssh deploy@$(hostname -I | awk '{print $1}')"
echo "4. Push code to main branch to trigger deployment"
echo ""
echo "📚 Full documentation: CI_CD_SETUP.md"
echo "=================================="

