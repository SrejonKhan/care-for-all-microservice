#!/bin/bash

# Local testing script for Donation Service

echo "🧪 Testing Donation Service..."
echo ""

# Configuration
BASE_URL="http://localhost:3003"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
  local name=$1
  local command=$2
  local expected_status=$3

  echo -n "Testing: $name... "

  response=$(eval "$command" 2>/dev/null)
  status=$?

  if [ $status -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "  Response: $response"
  fi
}

# Check if service is running
echo "Checking if service is running..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
  echo -e "${RED}✗ Service is not running on $BASE_URL${NC}"
  echo "  Please start the service first: ./start-local.sh"
  exit 1
fi
echo -e "${GREEN}✓ Service is running${NC}"
echo ""

# Test 1: Health Check
echo "=== System Tests ==="
run_test "Health check" "curl -s -o /dev/null -w '%{http_code}' $BASE_URL/health | grep -q '200'"

run_test "Root endpoint" "curl -s -o /dev/null -w '%{http_code}' $BASE_URL/ | grep -q '200'"

run_test "OpenAPI spec" "curl -s $BASE_URL/openapi | jq -e '.openapi == \"3.1.0\"' > /dev/null"

echo ""

# Test 2: Create Donation (Sufficient Balance)
echo "=== Donation Tests ==="

echo -n "Testing: Create donation (sufficient balance)... "
DONATION_RESPONSE=$(curl -s -X POST $BASE_URL/api/donations \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "test_campaign_123",
    "amount": 10000,
    "donorName": "Test Donor",
    "donorEmail": "test@example.com",
    "bankAccountId": "bank_acc_001"
  }')

if echo "$DONATION_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  DONATION_ID=$(echo "$DONATION_RESPONSE" | jq -r '.data.id')
  echo -e "${GREEN}✓${NC} (ID: $DONATION_ID)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}✗${NC}"
  echo "  Response: $DONATION_RESPONSE"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 3: Create Donation (Insufficient Balance)
echo -n "Testing: Create donation (insufficient balance)... "
FAIL_RESPONSE=$(curl -s -X POST $BASE_URL/api/donations \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "test_campaign_123",
    "amount": 50000,
    "donorName": "Test Donor 2",
    "donorEmail": "test2@example.com",
    "bankAccountId": "bank_acc_007"
  }')

if echo "$FAIL_RESPONSE" | jq -e '.success == false and .error.code == "INSUFFICIENT_BALANCE"' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}✗${NC}"
  echo "  Response: $FAIL_RESPONSE"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 4: Get Donation
if [ -n "$DONATION_ID" ]; then
  echo -n "Testing: Get donation by ID... "
  GET_RESPONSE=$(curl -s $BASE_URL/api/donations/$DONATION_ID)

  if echo "$GET_RESPONSE" | jq -e '.success == true and .data.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗${NC}"
    echo "  Response: $GET_RESPONSE"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
fi

# Test 5: List Donations
echo -n "Testing: List donations... "
LIST_RESPONSE=$(curl -s "$BASE_URL/api/donations?page=1&limit=10")

if echo "$LIST_RESPONSE" | jq -e '.success == true and .data.donations' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}✗${NC}"
  echo "  Response: $LIST_RESPONSE"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# Summary
echo "=== Test Summary ==="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi

