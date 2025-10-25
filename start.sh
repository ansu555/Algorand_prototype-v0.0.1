#!/bin/bash

# Startup script for Algorand Prototype with MCP Server
# This script starts both the MCP Analytics Server and the Next.js app

set -e

echo "🚀 Starting Algorand Prototype v0.0.1"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version) detected${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing main dependencies...${NC}"
    npm install
fi

# Install MCP server dependencies if needed
if [ ! -d "src/lib/mcp_server/node_modules" ]; then
    echo -e "${BLUE}📦 Installing MCP server dependencies...${NC}"
    cd src/lib/mcp_server
    npm install
    cd ../../..
fi

# Check if .env file exists for MCP server
if [ ! -f "src/lib/mcp_server/.env" ]; then
    echo -e "${YELLOW}⚠️  MCP server .env file not found. Using defaults.${NC}"
    echo "MCP_PORT=8080
MCP_BASE_URL=http://localhost:8080
MCP_ANALYTICS_API_KEY=7adf6888b6d771afd7259753434e74a3b612205b436dfe098fca0b163f6f17c9
COINGECKO_API_KEY=CG-yBGPehgHHsHoKf6haCAaEAWf" > src/lib/mcp_server/.env
    echo -e "${GREEN}✓ Created default .env file${NC}"
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    kill $MCP_PID 2>/dev/null || true
    kill $NEXT_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

# Start MCP Analytics Server
echo ""
echo -e "${BLUE}🔧 Starting MCP Analytics Server...${NC}"
cd src/lib/mcp_server
npm run dev > ../../../mcp-server.log 2>&1 &
MCP_PID=$!
cd ../../..

# Wait for MCP server to start
echo -e "${YELLOW}⏳ Waiting for MCP server to initialize...${NC}"
sleep 3

# Check if MCP server is running
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MCP Analytics Server is running on http://localhost:8080${NC}"
else
    echo -e "${YELLOW}⚠️  MCP server may not be ready yet. Continuing...${NC}"
fi

# Start Next.js App
echo ""
echo -e "${BLUE}🌐 Starting Next.js Application...${NC}"
npm run dev > nextjs.log 2>&1 &
NEXT_PID=$!

# Wait for Next.js to start
echo -e "${YELLOW}⏳ Waiting for Next.js to initialize...${NC}"
sleep 5

echo ""
echo -e "${GREEN}======================================"
echo "🎉 All systems are GO!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}📊 MCP Analytics Server:${NC} http://localhost:8080"
echo -e "${BLUE}🌐 Next.js Application:${NC} http://localhost:3000"
echo ""
echo -e "${GREEN}📖 Quick Start:${NC}"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Navigate to Cryptocurrencies page"
echo "   3. Click on any Algorand ecosystem token"
echo "   4. Go to 'AI Analysis' tab"
echo "   5. Click 'Analyze' to get detailed predictions"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo "   - MCP Server: mcp-server.log"
echo "   - Next.js: nextjs.log"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all servers${NC}"
echo ""

# Keep script running
wait $MCP_PID $NEXT_PID
