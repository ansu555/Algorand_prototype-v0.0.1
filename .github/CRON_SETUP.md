# GitHub Actions Cron Setup

This project uses GitHub Actions instead of Vercel Cron Jobs to run scheduled tasks.

## 📋 Setup Instructions

### 1. Add the CRON_SECRET to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/ansu555/Algorand_prototype-v0.0.1`
2. Click on **Settings** (repository settings, not account)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add the following secret:
   - **Name**: `CRON_SECRET`
   - **Value**: `cron_5d8f1b8b7f2a4c3e9e2d1c0a7b8d6f4a`
6. Click **Add secret**

### 2. Update the Deployment URL (if needed)

If your Vercel deployment URL is different from `algorand-prototype-v0-0-1.vercel.app`, update it in:
- `.github/workflows/daily-poller.yml` (line 18)

### 3. Test the Workflow

#### Manual Test:
1. Go to **Actions** tab in your GitHub repository
2. Click on **Daily Poller** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait a few seconds and check the results

#### Automatic Schedule:
- The workflow runs automatically **daily at midnight UTC (00:00)**
- You can see past runs in the **Actions** tab

## 🔧 Workflow Details

**File**: `.github/workflows/daily-poller.yml`

**Schedule**: Daily at 00:00 UTC (midnight)

**What it does**: 
- Calls your poller API endpoint
- Checks if the response is successful
- Logs the results
- Fails the workflow if the API returns an error

## 📊 Monitoring

- View workflow runs: `https://github.com/ansu555/Algorand_prototype-v0.0.1/actions`
- GitHub will email you if a workflow fails (if notifications are enabled)

## 🎯 Benefits Over Vercel Cron

✅ **Free** - No plan limits  
✅ **Reliable** - GitHub's infrastructure  
✅ **Visible** - Easy to see logs and history  
✅ **Flexible** - Easy to modify schedule  
✅ **Manual trigger** - Can run on-demand  

## 🔄 Alternative: Local Development

For local testing, you can still use:
```bash
npm run dev:cron
```

Or manually call:
```bash
curl "http://localhost:3000/api/poller/run?token=cron_5d8f1b8b7f2a4c3e9e2d1c0a7b8d6f4a"
```
