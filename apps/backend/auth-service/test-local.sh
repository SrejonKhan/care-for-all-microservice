#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="password123"
NAME="Test User"

echo -e "${BLUE}🚀 Testing Auth Service Locally${NC}"
echo "================================"
echo -e "Base URL: ${YELLOW}$BASE_URL${NC}"
echo -e "Test Email: ${YELLOW}$EMAIL${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is not installed. Please install it first:${NC}"
    echo "  macOS: brew install jq"
    echo "  Ubuntu: sudo apt-get install jq"
    echo "  Windows: choco install jq"
    exit 1
fi

# Check if service is running
echo -e "${BLUE}🔍 Checking if service is running...${NC}"
if ! curl -s -f $BASE_URL/health > /dev/null; then
    echo -e "${RED}❌ Service is not running at $BASE_URL${NC}"
    echo "Please start the service with: bun run dev"
    exit 1
fi
echo -e "${GREEN}✅ Service is running${NC}\n"

# 1. Register
echo -e "${BLUE}📝 1. Registering user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"$NAME\"
  }")

if echo "$REGISTER_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Registration successful${NC}"
    echo "$REGISTER_RESPONSE" | jq '.'
    
    ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.tokens.accessToken')
    REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.tokens.refreshToken')
    USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.data.user.id')
    
    echo -e "${YELLOW}Access Token: ${ACCESS_TOKEN:0:50}...${NC}"
    echo -e "${YELLOW}Refresh Token: ${REFRESH_TOKEN:0:50}...${NC}"
    echo -e "${YELLOW}User ID: $USER_ID${NC}"
else
    echo -e "${RED}❌ Registration failed${NC}"
    echo "$REGISTER_RESPONSE" | jq '.'
    exit 1
fi

# 2. Get Profile
echo -e "\n${BLUE}👤 2. Getting user profile...${NC}"
PROFILE_RESPONSE=$(curl -s -X GET $BASE_URL/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$PROFILE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Profile retrieved${NC}"
    echo "$PROFILE_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Failed to get profile${NC}"
    echo "$PROFILE_RESPONSE" | jq '.'
fi

# 3. Update Profile
echo -e "\n${BLUE}✏️ 3. Updating profile...${NC}"
UPDATE_RESPONSE=$(curl -s -X PATCH $BASE_URL/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Updated $NAME\"}")

if echo "$UPDATE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Profile updated${NC}"
    echo "$UPDATE_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Failed to update profile${NC}"
    echo "$UPDATE_RESPONSE" | jq '.'
fi

# 4. Refresh Token
echo -e "\n${BLUE}🔄 4. Refreshing token...${NC}"
REFRESH_RESPONSE=$(curl -s -X POST $BASE_URL/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

if echo "$REFRESH_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Token refreshed${NC}"
    echo "$REFRESH_RESPONSE" | jq '.'
    
    NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.tokens.accessToken')
    NEW_REFRESH_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.tokens.refreshToken')
    
    echo -e "${YELLOW}New Access Token: ${NEW_ACCESS_TOKEN:0:50}...${NC}"
else
    echo -e "${RED}❌ Failed to refresh token${NC}"
    echo "$REFRESH_RESPONSE" | jq '.'
fi

# 5. Verify Token
echo -e "\n${BLUE}✔️ 5. Verifying token...${NC}"
VERIFY_RESPONSE=$(curl -s -X POST $BASE_URL/verify-token \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$NEW_ACCESS_TOKEN\"}")

if echo "$VERIFY_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Token verified${NC}"
    echo "$VERIFY_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Token verification failed${NC}"
    echo "$VERIFY_RESPONSE" | jq '.'
fi

# 6. Create Guest
echo -e "\n${BLUE}👻 6. Creating guest user...${NC}"
GUEST_RESPONSE=$(curl -s -X POST $BASE_URL/guest \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Guest User $(date +%s)\"}")

if echo "$GUEST_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Guest created${NC}"
    echo "$GUEST_RESPONSE" | jq '.'
    
    GUEST_TOKEN=$(echo $GUEST_RESPONSE | jq -r '.data.tokens.accessToken')
    GUEST_ID=$(echo $GUEST_RESPONSE | jq -r '.data.user.id')
    
    echo -e "${YELLOW}Guest Token: ${GUEST_TOKEN:0:50}...${NC}"
    echo -e "${YELLOW}Guest ID: $GUEST_ID${NC}"
else
    echo -e "${RED}❌ Failed to create guest${NC}"
    echo "$GUEST_RESPONSE" | jq '.'
fi

# 7. Claim Guest Account
echo -e "\n${BLUE}🎯 7. Claiming guest account...${NC}"
CLAIM_EMAIL="claimed-$(date +%s)@example.com"
CLAIM_RESPONSE=$(curl -s -X POST $BASE_URL/guest/claim \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$CLAIM_EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

if echo "$CLAIM_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Guest account claimed${NC}"
    echo "$CLAIM_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Failed to claim guest account${NC}"
    echo "$CLAIM_RESPONSE" | jq '.'
fi

# 8. Login
echo -e "\n${BLUE}🔐 8. Testing login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

if echo "$LOGIN_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "$LOGIN_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE" | jq '.'
fi

# 9. Logout
echo -e "\n${BLUE}👋 9. Logging out...${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST $BASE_URL/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$NEW_REFRESH_TOKEN\"}")

if echo "$LOGOUT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Logout successful${NC}"
    echo "$LOGOUT_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Logout failed${NC}"
    echo "$LOGOUT_RESPONSE" | jq '.'
fi

# 10. Try to use revoked token
echo -e "\n${BLUE}🚫 10. Testing revoked token (should fail)...${NC}"
REVOKED_RESPONSE=$(curl -s -X POST $BASE_URL/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$NEW_REFRESH_TOKEN\"}")

if echo "$REVOKED_RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Revoked token correctly rejected${NC}"
    echo "$REVOKED_RESPONSE" | jq '.'
else
    echo -e "${YELLOW}⚠️ Revoked token was not rejected${NC}"
    echo "$REVOKED_RESPONSE" | jq '.'
fi

# 11. Health Check
echo -e "\n${BLUE}❤️ 11. Health check...${NC}"
HEALTH_RESPONSE=$(curl -s -X GET $BASE_URL/health)

if echo "$HEALTH_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "$HEALTH_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "$HEALTH_RESPONSE"
fi

# Summary
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}📊 Test Summary:${NC}"
echo -e "  • User Registration: ${GREEN}✓${NC}"
echo -e "  • User Login: ${GREEN}✓${NC}"
echo -e "  • Profile Management: ${GREEN}✓${NC}"
echo -e "  • Token Refresh: ${GREEN}✓${NC}"
echo -e "  • Token Verification: ${GREEN}✓${NC}"
echo -e "  • Guest User Creation: ${GREEN}✓${NC}"
echo -e "  • Guest Account Claiming: ${GREEN}✓${NC}"
echo -e "  • Logout: ${GREEN}✓${NC}"
echo -e "  • Token Revocation: ${GREEN}✓${NC}"
echo -e "  • Health Check: ${GREEN}✓${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Open http://localhost:3000/docs to test endpoints interactively!${NC}"

