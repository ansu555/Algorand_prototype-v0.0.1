# ✅ MCP Server Deployment Checklist

Use this checklist to verify your MCP Analytics Server is fully operational.

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git repository cloned/updated
- [ ] In project root directory (`pwd` shows correct path)

### Dependencies
- [ ] Main app dependencies installed (`npm install` in root)
- [ ] MCP server dependencies installed (`npm install` in `src/lib/mcp_server`)

### Configuration Files
- [ ] `.env` exists in `src/lib/mcp_server/`
- [ ] Contains `MCP_PORT=8080`
- [ ] Contains `MCP_BASE_URL=http://localhost:8080`
- [ ] Contains `MCP_ANALYTICS_API_KEY`
- [ ] Contains `COINGECKO_API_KEY`

### File Verification
- [ ] `src/lib/mcp_server/main.ts` exists
- [ ] `src/app/api/mcp/analyze/route.ts` exists
- [ ] `src/components/features/crypto/asset-analysis.tsx` exists
- [ ] `src/components/features/crypto/crypto-detail.tsx` has "AI Analysis" tab
- [ ] `start.sh` exists and is executable
- [ ] `start.bat` exists (Windows)

## 🚀 Server Startup Checklist

### MCP Server (Port 8080)
- [ ] Terminal 1 opened
- [ ] Changed directory to `src/lib/mcp_server`
- [ ] Ran `npm run dev`
- [ ] Server started successfully
- [ ] See message: "🚀 MCP Analytics Server running on port 8080"
- [ ] No errors in console

### Health Check
- [ ] Open new terminal
- [ ] Run: `curl http://localhost:8080/health`
- [ ] Response: `{"ok":true,"timestamp":"..."}`
- [ ] Charts directory created: `src/lib/mcp_server/mcp_server/charts/`

### Next.js App (Port 3000)
- [ ] Terminal 2 opened (keep Terminal 1 running)
- [ ] In project root directory
- [ ] Ran `npm run dev`
- [ ] App started successfully
- [ ] See message: "✓ Ready in ..."
- [ ] Browser opens to `http://localhost:3000`

## 🧪 Functionality Testing

### Basic Analysis Test
- [ ] Navigate to `http://localhost:3000`
- [ ] Click "Cryptocurrencies" in navigation
- [ ] Page loads with list of Algorand tokens
- [ ] Click on "Algorand" (or any token)
- [ ] Detail page loads with tabs
- [ ] "AI Analysis" tab is visible
- [ ] Click "AI Analysis" tab
- [ ] "Analyze ALGO" button appears
- [ ] Click "Analyze ALGO" button
- [ ] Loading indicator shows
- [ ] Analysis completes (2-5 seconds)
- [ ] No error messages

### Results Verification
- [ ] **Summary Tab** displays:
  - [ ] Market overview text
  - [ ] Overall analysis paragraph
  - [ ] Methodology accordion
  - [ ] Click accordion - shows calculations
- [ ] **Insights Tab** displays:
  - [ ] 6+ insight cards
  - [ ] RSI analysis with emoji
  - [ ] MA trend analysis
  - [ ] MACD analysis
  - [ ] Volatility assessment
- [ ] **Predictions Tab** displays:
  - [ ] 7 prediction cards (Day 1-7)
  - [ ] Each shows date, price, confidence %
  - [ ] Confidence indicators (green/yellow/red)
  - [ ] Disclaimer note at bottom
- [ ] **Strategies Tab** displays:
  - [ ] 2-3 strategy cards
  - [ ] Each has name, description, risk badge
  - [ ] Risk badges color-coded correctly
- [ ] **Charts Tab** displays:
  - [ ] 2 chart images
  - [ ] Historical price chart loads
  - [ ] Forecast chart loads
  - [ ] Charts are visible (not broken)

### Advanced Features Test
- [ ] Click "Refresh Analysis" button - works
- [ ] Try different token (e.g., USDC) - works
- [ ] Methodology accordion - expands/collapses
- [ ] Full calculation text visible
- [ ] Tab switching smooth
- [ ] No console errors (F12 → Console)

## 🌐 API Testing

### Direct MCP Server
```bash
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 7adf6888b6d771afd7259753434e74a3b612205b436dfe098fca0b163f6f17c9" \
  -d '{"coin":"algorand","tasks":["analysis"]}'
```

- [ ] Command runs without errors
- [ ] Response is valid JSON
- [ ] Response contains `"ok": true`
- [ ] Response has `summary` field
- [ ] Response has `insights` array

### Next.js API Proxy
```bash
curl -X POST http://localhost:3000/api/mcp/analyze \
  -H "Content-Type: application/json" \
  -d '{"coin":"algorand"}'
```

- [ ] Command runs without errors
- [ ] Response is valid JSON
- [ ] Response matches MCP server format
- [ ] No CORS errors

## 📊 Data Verification

### Algorand Analysis
- [ ] Analyze "Algorand" (ALGO)
- [ ] Summary shows current price (> $0)
- [ ] Summary shows 24h change (%)
- [ ] Trend identified (bullish/bearish/neutral)
- [ ] RSI value between 0-100
- [ ] Predictions have dates in future
- [ ] Predictions have realistic prices
- [ ] Confidence scores decrease over time (Day 1 > Day 7)

### Other Tokens
Test with 2-3 different tokens:
- [ ] Bitcoin (if available) - works
- [ ] Ethereum (if available) - works
- [ ] Another Algorand token - works

### Edge Cases
- [ ] Analyze same token twice - both work
- [ ] Analyze quickly after previous - handles correctly
- [ ] Invalid token ID - shows error message
- [ ] Network disconnected - shows error with suggestion

## 🎨 UI/UX Verification

### Responsive Design
- [ ] Desktop view (>1200px) - looks good
- [ ] Tablet view (768-1200px) - looks good
- [ ] Mobile view (<768px) - looks good
- [ ] All tabs accessible on mobile
- [ ] Buttons properly sized

### Dark Mode (if enabled)
- [ ] Dark mode toggle works
- [ ] Charts visible in dark mode
- [ ] Text readable in dark mode
- [ ] Badges/colors appropriate

### Accessibility
- [ ] Tab key navigation works
- [ ] Focus indicators visible
- [ ] Color contrast adequate
- [ ] Screen reader friendly (if tested)

## 🔍 Error Handling

### Network Errors
- [ ] Stop MCP server
- [ ] Try analysis - shows error
- [ ] Error message helpful
- [ ] Restart MCP - works again

### Invalid Inputs
- [ ] Analyze non-existent coin - error shown
- [ ] Error suggests valid alternatives
- [ ] UI doesn't crash

### Rate Limiting
- [ ] Multiple rapid requests handled
- [ ] No server crashes
- [ ] Graceful degradation

## 📝 Documentation Check

### Files Exist
- [ ] `MCP_AI_ANALYSIS_GUIDE.md` - complete guide
- [ ] `MCP_SERVER_SETUP.md` - setup instructions
- [ ] `AI_ANALYSIS_README.md` - quick reference
- [ ] `IMPLEMENTATION_SUMMARY.md` - what was built
- [ ] `ARCHITECTURE_DIAGRAM.md` - system diagram

### Documentation Accuracy
- [ ] Port numbers correct (8080, 3000)
- [ ] File paths accurate
- [ ] Commands work as documented
- [ ] Examples produce expected results

## 🚨 Common Issues Resolution

### Issue: Port 8080 in use
**Solution:**
```bash
# macOS/Linux
lsof -i :8080
kill -9 <PID>

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```
- [ ] Port freed
- [ ] MCP server restarts

### Issue: Charts not displaying
**Check:**
- [ ] Charts directory exists: `src/lib/mcp_server/mcp_server/charts/`
- [ ] Directory writable: `chmod -R 755 src/lib/mcp_server/mcp_server/`
- [ ] MCP_BASE_URL correct in `.env`
- [ ] Charts URLs accessible in browser

### Issue: Analysis returns error
**Check:**
- [ ] MCP server running: `curl http://localhost:8080/health`
- [ ] CoinGecko API key valid
- [ ] Coin ID correct (from cryptocurrencies table)
- [ ] Internet connection working
- [ ] Check MCP server logs for details

### Issue: Predictions seem wrong
**Verify:**
- [ ] Using correct coin ID (not symbol)
- [ ] Sufficient historical data (>2 days)
- [ ] Methodology accordion shows calculations
- [ ] Confidence scores make sense
- [ ] Remember: predictions are directional, not exact

## 🎯 Final Verification

### Complete User Flow
**Follow this exact sequence:**
1. [ ] Open `http://localhost:3000`
2. [ ] Click "Cryptocurrencies"
3. [ ] Search for "Algorand" (if needed)
4. [ ] Click on Algorand
5. [ ] Click "AI Analysis" tab
6. [ ] Click "Analyze ALGO"
7. [ ] Wait for loading
8. [ ] Click each tab (Summary, Insights, Predictions, Strategies, Charts)
9. [ ] Expand methodology accordion
10. [ ] Read full calculations
11. [ ] Click "Refresh Analysis"
12. [ ] New analysis completes
13. [ ] Go back to cryptocurrencies
14. [ ] Pick different token
15. [ ] Analyze works again

### Performance Check
- [ ] Analysis completes in <10 seconds
- [ ] UI responsive during loading
- [ ] Charts load within 2 seconds
- [ ] No memory leaks after multiple analyses
- [ ] Server logs clean (no warnings)

### Security Check
- [ ] API key in .env (not in code)
- [ ] Authorization header used for MCP server
- [ ] No sensitive data in client-side code
- [ ] CORS configured correctly
- [ ] Error messages don't leak secrets

## 📊 Metrics

Record these for reference:
- Analysis completion time: _____ seconds
- Chart generation time: _____ seconds
- Memory usage (MCP server): _____ MB
- Memory usage (Next.js): _____ MB
- Number of successful analyses: _____
- Number of errors: _____

## ✅ Sign-Off

- [ ] All core features working
- [ ] No critical errors
- [ ] Documentation complete
- [ ] Ready for use

**Deployment Date:** _______________
**Deployed By:** _______________
**Version:** v0.0.1

## 🎉 Success Criteria Met

If all checkboxes above are checked:
- ✅ MCP Server is fully functional
- ✅ Analyzes Algorand ecosystem assets
- ✅ Provides detailed predictions with calculations
- ✅ Shows charts and strategies
- ✅ UI is responsive and accessible
- ✅ Documentation is complete

**Status: READY FOR PRODUCTION** 🚀

---

## 📞 Support Contacts

If issues persist after going through this checklist:

1. **Review Logs:**
   - MCP Server: `tail -f mcp-server.log`
   - Next.js: `tail -f nextjs.log`

2. **Check Documentation:**
   - Full guide: `MCP_AI_ANALYSIS_GUIDE.md`
   - Setup: `MCP_SERVER_SETUP.md`

3. **Restart Everything:**
   ```bash
   pkill -f "npm run dev"
   ./start.sh  # or start.bat
   ```

4. **Verify Environment:**
   - Node version: `node --version` (18+)
   - npm version: `npm --version`
   - Internet connection
   - API keys valid
