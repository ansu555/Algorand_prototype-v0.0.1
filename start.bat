@echo off
REM Startup script for Algorand Prototype with MCP Server (Windows)
REM This script starts both the MCP Analytics Server and the Next.js app

echo.
echo Starting Algorand Prototype v0.0.1
echo ======================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% detected
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the project root directory
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing main dependencies...
    call npm install
)

REM Install MCP server dependencies if needed
if not exist "src\lib\mcp_server\node_modules" (
    echo [INFO] Installing MCP server dependencies...
    cd src\lib\mcp_server
    call npm install
    cd ..\..\..
)

REM Check if .env file exists for MCP server
if not exist "src\lib\mcp_server\.env" (
    echo [WARNING] MCP server .env file not found. Creating default...
    (
        echo MCP_PORT=8080
        echo MCP_BASE_URL=http://localhost:8080
        echo MCP_ANALYTICS_API_KEY=7adf6888b6d771afd7259753434e74a3b612205b436dfe098fca0b163f6f17c9
        echo COINGECKO_API_KEY=CG-yBGPehgHHsHoKf6haCAaEAWf
    ) > src\lib\mcp_server\.env
    echo [OK] Created default .env file
)

echo.
echo [INFO] Starting MCP Analytics Server...
cd src\lib\mcp_server
start "MCP Server" cmd /c "npm run dev > ..\..\..\mcp-server.log 2>&1"
cd ..\..\..

REM Wait for MCP server to start
echo [INFO] Waiting for MCP server to initialize...
timeout /t 5 /nobreak >nul

REM Start Next.js App
echo.
echo [INFO] Starting Next.js Application...
start "Next.js App" cmd /c "npm run dev > nextjs.log 2>&1"

REM Wait for Next.js to start
echo [INFO] Waiting for Next.js to initialize...
timeout /t 5 /nobreak >nul

echo.
echo ======================================
echo All systems are GO!
echo ======================================
echo.
echo MCP Analytics Server: http://localhost:8080
echo Next.js Application: http://localhost:3000
echo.
echo Quick Start:
echo    1. Open http://localhost:3000 in your browser
echo    2. Navigate to Cryptocurrencies page
echo    3. Click on any Algorand ecosystem token
echo    4. Go to 'AI Analysis' tab
echo    5. Click 'Analyze' to get detailed predictions
echo.
echo Logs:
echo    - MCP Server: mcp-server.log
echo    - Next.js: nextjs.log
echo.
echo Press any key to stop all servers...
pause >nul

REM Cleanup
taskkill /FI "WindowTitle eq MCP Server*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Next.js App*" /F >nul 2>&1

echo.
echo Servers stopped.
echo.
