#!/bin/bash

# Manual Poller Trigger Script
# Run this anytime to manually trigger the poller

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Triggering Poller...${NC}"

# Detect environment (local or production)
if [ "$1" == "prod" ] || [ "$1" == "production" ]; then
    URL="https://algorand-prototype-v0-0-1.vercel.app/api/poller/run?token=cron_5d8f1b8b7f2a4c3e9e2d1c0a7b8d6f4a"
    echo -e "${YELLOW}Environment: Production${NC}"
else
    URL="http://localhost:3000/api/poller/run?token=cron_5d8f1b8b7f2a4c3e9e2d1c0a7b8d6f4a"
    echo -e "${YELLOW}Environment: Local${NC}"
fi

echo "Calling: $URL"
echo ""

# Make the request and capture response
response=$(curl -s -w "\n%{http_code}" "$URL")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

# Parse JSON response (requires jq)
if command -v jq &> /dev/null; then
    echo -e "${YELLOW}Response (formatted):${NC}"
    echo "$body" | jq '.'
else
    echo -e "${YELLOW}Response:${NC}"
    echo "$body"
fi

echo ""
echo -e "${YELLOW}HTTP Status: $http_code${NC}"

# Check if successful
if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ Poller executed successfully!${NC}"
    
    # Extract stats if jq is available
    if command -v jq &> /dev/null; then
        checked=$(echo "$body" | jq -r '.checked // 0')
        triggered=$(echo "$body" | jq -r '.triggered | length // 0')
        errors=$(echo "$body" | jq -r '.errors | length // 0')
        
        echo ""
        echo -e "${GREEN}📊 Stats:${NC}"
        echo "  Rules Checked: $checked"
        echo "  Trades Triggered: $triggered"
        echo "  Errors: $errors"
    fi
else
    echo -e "${RED}❌ Poller failed with status $http_code${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}💡 Tip: Run with 'prod' argument for production:${NC}"
echo "  ./scripts/trigger-poller.sh prod"
