#!/bin/bash

# Campaign Service Local Testing Script
# This script runs automated tests against the local Campaign Service

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001"
AUTH_URL="http://localhost:3000"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Campaign Service Local Test Suite    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if service is running
echo -e "${YELLOW}1. Checking if Campaign Service is running...${NC}"
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ Campaign Service is not running!${NC}"
    echo "Please start the service first: bun run start:local"
    exit 1
fi
echo -e "${GREEN}✓ Campaign Service is running${NC}"
echo ""

# Check if Auth Service is running
echo -e "${YELLOW}2. Checking if Auth Service is running...${NC}"
if ! curl -s "$AUTH_URL/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Auth Service is not running (required for authenticated tests)${NC}"
    echo "Start Auth Service to run full test suite"
    AUTH_AVAILABLE=false
else
    echo -e "${GREEN}✓ Auth Service is running${NC}"
    AUTH_AVAILABLE=true
fi
echo ""

# Test 1: Health Check
echo -e "${YELLOW}3. Testing Health Check...${NC}"
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "$HEALTH_RESPONSE"
fi
echo ""

# Test 2: List Campaigns (Public)
echo -e "${YELLOW}4. Testing List Campaigns (Public)...${NC}"
LIST_RESPONSE=$(curl -s "$API_URL/campaigns")
if echo "$LIST_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✓ List campaigns passed${NC}"
else
    echo -e "${RED}✗ List campaigns failed${NC}"
    echo "$LIST_RESPONSE"
fi
echo ""

# Test 3: OpenAPI Documentation
echo -e "${YELLOW}5. Testing OpenAPI Documentation...${NC}"
OPENAPI_RESPONSE=$(curl -s "$API_URL/openapi")
if echo "$OPENAPI_RESPONSE" | grep -q "openapi"; then
    echo -e "${GREEN}✓ OpenAPI documentation available${NC}"
else
    echo -e "${RED}✗ OpenAPI documentation failed${NC}"
fi
echo ""

# Authenticated Tests (if Auth Service is available)
if [ "$AUTH_AVAILABLE" = true ]; then
    echo -e "${YELLOW}6. Running Authenticated Tests...${NC}"
    
    # Login to get token
    echo -e "${YELLOW}   6.1. Getting access token...${NC}"
    
    # Try to login (user might not exist, so we'll register first)
    REGISTER_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test-campaign@example.com",
            "password": "Test123!@#",
            "name": "Campaign Test User"
        }')
    
    # Login
    LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test-campaign@example.com",
            "password": "Test123!@#"
        }')
    
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}   ✗ Failed to get access token${NC}"
    else
        echo -e "${GREEN}   ✓ Access token obtained${NC}"
        
        # Test 4: Create Campaign
        echo -e "${YELLOW}   6.2. Testing Create Campaign...${NC}"
        CREATE_RESPONSE=$(curl -s -X POST "$API_URL/campaigns" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d '{
                "title": "Test Campaign - Automated",
                "description": "This is an automated test campaign created by the test script",
                "goalAmount": 10000,
                "startDate": "2024-01-01T00:00:00Z",
                "endDate": "2024-12-31T23:59:59Z",
                "category": "Medical"
            }')
        
        if echo "$CREATE_RESPONSE" | grep -q "success"; then
            CAMPAIGN_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
            echo -e "${GREEN}   ✓ Campaign created: $CAMPAIGN_ID${NC}"
            
            # Test 5: Get Campaign by ID
            echo -e "${YELLOW}   6.3. Testing Get Campaign by ID...${NC}"
            GET_RESPONSE=$(curl -s "$API_URL/campaigns/$CAMPAIGN_ID")
            if echo "$GET_RESPONSE" | grep -q "Test Campaign - Automated"; then
                echo -e "${GREEN}   ✓ Get campaign by ID passed${NC}"
            else
                echo -e "${RED}   ✗ Get campaign by ID failed${NC}"
            fi
            
            # Test 6: Update Campaign
            echo -e "${YELLOW}   6.4. Testing Update Campaign...${NC}"
            UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/campaigns/$CAMPAIGN_ID" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d '{
                    "title": "Updated Test Campaign",
                    "status": "ACTIVE"
                }')
            
            if echo "$UPDATE_RESPONSE" | grep -q "Updated Test Campaign"; then
                echo -e "${GREEN}   ✓ Update campaign passed${NC}"
            else
                echo -e "${RED}   ✗ Update campaign failed${NC}"
            fi
            
            # Test 7: Delete Campaign
            echo -e "${YELLOW}   6.5. Testing Delete Campaign...${NC}"
            DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/campaigns/$CAMPAIGN_ID" \
                -H "Authorization: Bearer $TOKEN")
            
            if echo "$DELETE_RESPONSE" | grep -q "success"; then
                echo -e "${GREEN}   ✓ Delete campaign passed${NC}"
            else
                echo -e "${RED}   ✗ Delete campaign failed${NC}"
            fi
        else
            echo -e "${RED}   ✗ Create campaign failed${NC}"
            echo "$CREATE_RESPONSE"
        fi
    fi
else
    echo -e "${YELLOW}6. Skipping authenticated tests (Auth Service not available)${NC}"
fi
echo ""

# Test 8: Filter Campaigns
echo -e "${YELLOW}7. Testing Campaign Filters...${NC}"
FILTER_RESPONSE=$(curl -s "$API_URL/campaigns?status=ACTIVE&page=1&pageSize=5")
if echo "$FILTER_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✓ Campaign filters passed${NC}"
else
    echo -e "${RED}✗ Campaign filters failed${NC}"
fi
echo ""

# Test 9: Pagination
echo -e "${YELLOW}8. Testing Pagination...${NC}"
PAGE_RESPONSE=$(curl -s "$API_URL/campaigns?page=1&pageSize=2")
if echo "$PAGE_RESPONSE" | grep -q "totalPages"; then
    echo -e "${GREEN}✓ Pagination passed${NC}"
else
    echo -e "${RED}✗ Pagination failed${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Test Suite Complete           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}All basic tests completed!${NC}"
echo ""
echo "For more detailed testing:"
echo "  - Run unit tests: bun test"
echo "  - View API docs: http://localhost:3001/docs"
echo "  - Check logs: tail -f logs/campaign-service.log"
echo ""

