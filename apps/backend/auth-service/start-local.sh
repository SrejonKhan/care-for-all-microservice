#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Auth Service Locally${NC}"
echo "================================"
echo ""

# Check if MongoDB is running
echo -e "${BLUE}🔍 Checking MongoDB...${NC}"
if mongosh --eval "db.version()" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB is running${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB is not running${NC}"
    echo -e "${YELLOW}Starting MongoDB with Docker...${NC}"
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        echo "Please install Docker or start MongoDB manually"
        exit 1
    fi
    
    # Check if mongodb-local container exists
    if docker ps -a --format '{{.Names}}' | grep -q '^mongodb-local$'; then
        echo -e "${YELLOW}Starting existing MongoDB container...${NC}"
        docker start mongodb-local
    else
        echo -e "${YELLOW}Creating new MongoDB container...${NC}"
        docker run -d \
          --name mongodb-local \
          -p 27017:27017 \
          mongo:latest
    fi
    
    # Wait for MongoDB to be ready
    echo -e "${YELLOW}Waiting for MongoDB to be ready...${NC}"
    sleep 3
    
    if mongosh --eval "db.version()" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB is now running${NC}"
    else
        echo -e "${RED}❌ Failed to start MongoDB${NC}"
        exit 1
    fi
fi

echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo -e "${YELLOW}Creating .env.local from example...${NC}"
    
    cat > .env.local << 'EOF'
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
MONGODB_URI=mongodb://localhost:27017/care_for_all_dev
JWT_SECRET=local_dev_secret_key_change_in_production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
EOF
    
    echo -e "${GREEN}✅ Created .env.local${NC}"
else
    echo -e "${GREEN}✅ .env.local exists${NC}"
fi

echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    bun install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
    echo ""
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
    echo ""
fi

# Start the service
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}🎉 Starting Auth Service${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}📚 Swagger Documentation:${NC} ${YELLOW}http://localhost:3000/docs${NC}"
echo -e "${BLUE}📄 OpenAPI Spec:${NC} ${YELLOW}http://localhost:3000/openapi${NC}"
echo -e "${BLUE}❤️  Health Check:${NC} ${YELLOW}http://localhost:3000/health${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start with hot reload
bun --env-file=.env.local run dev

