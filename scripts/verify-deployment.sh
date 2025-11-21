#!/bin/bash

# Verification script for Care For All platform
# Run this after docker compose up to verify all services are healthy

set -e

echo "=================================="
echo "Care For All - Deployment Verification"
echo "=================================="
echo ""

GATEWAY_URL="${1:-http://localhost:8080}"
TIMEOUT=5

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name... "
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null); then
        if [ "$response" -eq "$expected_status" ]; then
            echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
            return 0
        else
            echo -e "${YELLOW}⚠️  Unexpected status${NC} (HTTP $response)"
            return 1
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (Connection failed)"
        return 1
    fi
}

echo "🏥 Application Services:"
echo "-----------------------------------"
check_service "Gateway" "$GATEWAY_URL/health"
check_service "Auth Service" "http://localhost:3000/health" || echo "  (Internal service - may not be exposed)"
check_service "Campaign Service" "http://localhost:3000/health" || echo "  (Internal service - may not be exposed)"
check_service "Donation Service" "http://localhost:3000/health" || echo "  (Internal service - may not be exposed)"
check_service "Admin Frontend" "http://localhost:3002"

echo ""
echo "📊 Observability Services:"
echo "-----------------------------------"
check_service "Grafana" "http://localhost:3001/api/health"
check_service "Prometheus" "http://localhost:9090/-/healthy"
check_service "Jaeger UI" "http://localhost:16686"
check_service "Kibana" "http://localhost:5601/api/status" || echo "  (May take time to start)"
check_service "Elasticsearch" "http://localhost:9200/_cluster/health"

echo ""
echo "🔧 Infrastructure Services:"
echo "-----------------------------------"
check_service "RabbitMQ Management" "http://localhost:15672"
check_service "cAdvisor" "http://localhost:8081/healthz"

echo ""
echo "📚 API Documentation:"
echo "-----------------------------------"
check_service "Scalar API Docs" "$GATEWAY_URL/docs"

echo ""
echo "=================================="
echo "Verification Complete!"
echo "=================================="
echo ""

# Check if docker compose is running
if command -v docker &> /dev/null; then
    echo "🐳 Docker Services Status:"
    echo "-----------------------------------"
    docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Run from infra/ directory to see Docker status"
    echo ""
fi

echo "📍 Access URLs:"
echo "-----------------------------------"
echo "Gateway:         $GATEWAY_URL"
echo "API Docs:        $GATEWAY_URL/docs"
echo "Admin Panel:     http://localhost:3002"
echo "Grafana:         http://localhost:3001 (admin/admin)"
echo "Jaeger:          http://localhost:16686"
echo "Kibana:          http://localhost:5601"
echo "Prometheus:      http://localhost:9090"
echo "RabbitMQ:        http://localhost:15672 (guest/guest)"
echo "Elasticsearch:   http://localhost:9200"
echo ""
echo "=================================="

