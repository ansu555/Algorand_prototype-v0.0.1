# Fix for Rewards Database Error on Vercel

## Problem
The rewards system uses `better-sqlite3` which requires file system write access. Vercel's serverless functions have **read-only** filesystems, causing the error:
```
{success: false, error: "unable to open database file"}
```

## Immediate Solution

### Option 1: Add Turso Environment Variables to Vercel (RECOMMENDED)

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add these variables:

```bash
TURSO_DATABASE_URL=libsql://algorand-ansu555.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjEwMzMwOTMsImlkIjoiNDM4YzkzN2EtNzljNS00MDk2LWI1ZmEtYmJkZTU1M2YzYzEwIiwicmlkIjoiYmFjZGFiODQtY2EzZS00ZmIyLWJiNmYtNDQ1ZjNiMGFhOGZiIn0.aaDmjXX9qjjITNwEQbYjyB3u0e3vRJ4CAZzx5ZyuV5MVDWcZrkwc9Oxf-swdOUD8LMYriFm8tM7ip85hdxd3CA
```

4. Redeploy your app

### Option 2: Disable Rewards Temporarily

Modify the rewards API routes to return empty data instead of errors.

## Long-term Solution

Migrate all rewards database operations from `better-sqlite3` to Turso (libsql) - this requires:

1. Converting all sync functions to async
2. Updating all API routes to use async/await
3. Testing thoroughly

The migration is in progress in this file but needs completion.

## Files to Update

- `src/lib/rewards/db.ts` - Convert to async Turso operations
- `src/app/api/rewards/route.ts` - Add await calls
- `src/app/api/rewards/track/route.ts` - Add await calls  
- `src/app/api/rewards/claim/route.ts` - Add await calls
- `src/app/api/rewards/quests/route.ts` - Add await calls
