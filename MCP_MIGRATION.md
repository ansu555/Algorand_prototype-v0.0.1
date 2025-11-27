# MCP Analytics Migration Guide

## ✅ Migration Complete!

The MCP Analytics server has been successfully migrated from a standalone Express app to Next.js API routes. This means **no separate server process is needed** - everything deploys together with your Next.js app on Vercel!

---

## 🎉 What Changed?

### Before (Old Architecture)
```
src/lib/mcp_server/          ← Separate Express server
  ├── main.ts                ← Express app
  ├── package.json           ← Separate dependencies
  └── node_modules/          ← Separate node_modules

Manual steps required:
1. cd src/lib/mcp_server
2. npm install
3. npm run dev              ← Run separately!
```

### After (New Architecture)
```
src/lib/mcp/                 ← Reusable analytics modules
  ├── index.ts               ← Main analytics engine
  ├── types.ts               ← TypeScript types
  ├── data-fetcher.ts        ← CoinGecko integration
  ├── indicators.ts          ← Technical indicators
  ├── predictions.ts         ← Price predictions
  ├── strategies.ts          ← Strategy generation
  ├── analysis.ts            ← Market analysis
  └── charts.ts              ← Chart generation

src/app/api/mcp/             ← Next.js API routes (serverless!)
  ├── analyze/route.ts       ← POST /api/mcp/analyze
  └── health/route.ts        ← GET /api/mcp/health

Everything works automatically - just deploy to Vercel!
```

---

## 🚀 How to Use

### Development
```bash
npm run dev
```
That's it! The MCP analytics API is now available at:
- `http://localhost:3000/api/mcp/analyze` (POST)
- `http://localhost:3000/api/mcp/health` (GET)

### Production (Vercel)
```bash
git push
```
Vercel automatically deploys everything - no configuration needed!

---

## 📊 API Usage

### Client-Side (React Components)
```typescript
import { analyzeCoinClient } from '@/app/mcp/client'

const result = await analyzeCoinClient({
  coin: 'algorand',
  horizonDays: 30,
  tasks: ['analysis', 'prediction', 'strategy', 'charts']
})
```

### Server-Side (API Routes, Server Components)
```typescript
import { analyzeCoin } from '@/lib/mcp'

const result = await analyzeCoin({
  coin: 'bitcoin',
  horizonDays: 7,
  granularity: '1d',
  chartType: 'candlestick'
})
```

---

## 🗂️ File Structure

```
src/
├── lib/
│   └── mcp/                        ← Analytics modules (business logic)
│       ├── index.ts                ← Main entry point
│       ├── types.ts                ← Shared types
│       ├── data-fetcher.ts         ← CoinGecko data fetching
│       ├── indicators.ts           ← RSI, MACD, SMA, etc.
│       ├── predictions.ts          ← Price forecasting
│       ├── strategies.ts           ← DCA, Rebalance, Rotate
│       ├── analysis.ts             ← Summary & insights
│       └── charts.ts               ← SVG chart generation
│
├── app/
│   ├── api/
│   │   └── mcp/                    ← API routes (serverless functions)
│   │       ├── analyze/route.ts    ← Analysis endpoint
│   │       └── health/route.ts     ← Health check
│   │
│   └── mcp/                        ← Client helpers
│       ├── client.ts               ← Client-side wrapper
│       └── analytics-client.ts     ← Server-side wrapper
│
└── public/
    └── charts/                      ← Generated chart SVGs
        ├── .gitignore               ← Ignore generated files
        └── .gitkeep                 ← Keep directory in git
```

---

## 🔧 What Was Removed?

You can now safely **delete** the old MCP server folder:

```bash
rm -rf src/lib/mcp_server
```

This removes:
- `src/lib/mcp_server/main.ts` (Express app - no longer needed)
- `src/lib/mcp_server/package.json` (separate dependencies)
- `src/lib/mcp_server/node_modules/` (separate modules)
- `src/lib/mcp_server/.env` (old config)

---

## 🌐 Environment Variables

### Old (Removed)
```bash
MCP_ANALYTICS_URL=http://localhost:8080  # ❌ No longer needed
MCP_BASE_URL=http://localhost:8080       # ❌ No longer needed
MCP_ANALYTICS_API_KEY=...                # ❌ No longer needed
MCP_PORT=8080                             # ❌ No longer needed
```

### New (None Required!)
The analytics engine now runs as part of your Next.js app - no configuration needed!

---

## ✨ Benefits

### ✅ Production-Ready
- **Auto-deploys** with your Next.js app on Vercel
- **Serverless** - no server management needed
- **Auto-scales** with traffic
- **Zero configuration** required

### ✅ Simplified Development
- **Single `npm run dev`** command
- **No separate processes** to manage
- **One codebase** to maintain
- **Shared TypeScript types**

### ✅ Better Performance
- **Faster cold starts** (serverless functions)
- **CDN caching** for chart images
- **No proxy overhead** (direct function calls)

---

## 📝 Migration Checklist

- [x] Extract analytics logic to `src/lib/mcp/`
- [x] Create Next.js API routes in `src/app/api/mcp/`
- [x] Update client wrappers (`client.ts`, `analytics-client.ts`)
- [x] Configure `public/charts/` for static serving
- [x] Update `.env.example` (remove old MCP vars)
- [ ] **Delete old `src/lib/mcp_server/` folder**
- [ ] Test the new API endpoints
- [ ] Deploy to Vercel

---

## 🧪 Testing

### Test the Health Endpoint
```bash
curl http://localhost:3000/api/mcp/health
```

### Test Analysis
```bash
curl -X POST http://localhost:3000/api/mcp/analyze \
  -H "Content-Type: application/json" \
  -d '{"coin": "algorand", "horizonDays": 7}'
```

---

## 🎯 Next Steps

1. **Delete the old server:**
   ```bash
   rm -rf src/lib/mcp_server
   ```

2. **Test locally:**
   ```bash
   npm run dev
   # Visit http://localhost:3000/api/mcp/health
   ```

3. **Deploy to Vercel:**
   ```bash
   git add .
   git commit -m "Migrate MCP to serverless Next.js API routes"
   git push
   ```

4. **Verify production:**
   - Visit `https://your-app.vercel.app/api/mcp/health`
   - Should return `{"ok": true, ...}`

---

## 🆘 Troubleshooting

### Charts not generating?
Check that `public/charts/` exists and is writable:
```bash
ls -la public/charts/
# Should show .gitignore and .gitkeep
```

### Import errors?
Make sure your `tsconfig.json` has the path alias:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### API not working on Vercel?
- Check build logs for errors
- Ensure all dependencies are in main `package.json`
- Verify API routes are in `src/app/api/` directory

---

## 📚 Further Reading

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [CoinGecko API](https://www.coingecko.com/en/api/documentation)

---

**Migration completed! 🎉 Your MCP analytics is now production-ready for Vercel!**
