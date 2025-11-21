#!/bin/bash

# Campaign Service Local Startup Script
# This script starts MongoDB and the Campaign Service for local development

set -e

echo "🚀 Starting Campaign Service locally..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if MongoDB is running
echo -e "${YELLOW}Checking MongoDB...${NC}"
if ! mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${RED}MongoDB is not running!${NC}"
    echo "Please start MongoDB first:"
    echo "  - Using service: sudo systemctl start mongod"
    echo "  - Using Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest"
    exit 1
fi
echo -e "${GREEN}✓ MongoDB is running${NC}"

# Check if RabbitMQ is running (optional)
echo -e "${YELLOW}Checking RabbitMQ (optional)...${NC}"
if ! curl -s http://localhost:15672 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ RabbitMQ is not running (optional for basic testing)${NC}"
    echo "To enable event features, start RabbitMQ:"
    echo "  docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3-management"
else
    echo -e "${GREEN}✓ RabbitMQ is running${NC}"
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Creating .env.local file...${NC}"
    cat > .env.local << EOF
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/campaign-service-dev
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=care-for-all
JWT_SECRET=your-secret-key-change-in-production
AUTH_SERVICE_URL=http://localhost:3000
LOG_LEVEL=debug
EOF
    echo -e "${GREEN}✓ Created .env.local${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
bun install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Start the service
echo -e "${GREEN}Starting Campaign Service on port 3001...${NC}"
echo -e "${GREEN}API Documentation: http://localhost:3001/docs${NC}"
echo -e "${GREEN}Health Check: http://localhost:3001/health${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

bun run dev:local

