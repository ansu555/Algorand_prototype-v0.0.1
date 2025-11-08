# 🚀 Manual Poller Trigger Guide

You can trigger the poller manually in **4 different ways**:

---

## 1️⃣ **Admin UI (Easiest)** ⭐

### Local:
1. Start your dev server: `npm run dev`
2. Go to: `http://localhost:3000/admin/poller`
3. Click **"Run Poller Now"** button

### Production:
1. Go to: `https://algorand-prototype-v0-0-1.vercel.app/admin/poller`
2. Click **"Run Poller Now"** button

**✅ Works on both local and production!**

---

## 2️⃣ **Shell Script (Fast)**

### Local:
```bash
./scripts/trigger-poller.sh
```

### Production:
```bash
./scripts/trigger-poller.sh prod
```

---

## 3️⃣ **Direct cURL**

### Local:
```bash
curl "http://localhost:3000/api/poller/run?token=cron_5d8f1b8b7f2a4c3e9e2d1c0a7b8d6f4a"
```

### Production:
```bash
curl "https://algorand-prototype-v0-0-1.vercel.app/api/poller/run?token=cron_5d8f1b8b7f2a4c3e9e2d1c0a7b8d6f4a"
```

---

## 4️⃣ **GitHub Actions (Automated + Manual)**

### Manual Trigger:
1. Go to: https://github.com/ansu555/Algorand_prototype-v0.0.1/actions
2. Click **"Daily Poller"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

### Automatic Schedule:
- Runs **daily at midnight UTC** (5:30 AM IST)
- No action needed - fully automatic!

---

## 📊 What Happens When You Run It?

```
1. Fetches all ACTIVE trading rules from database
2. Gets current prices for all target cryptocurrencies
3. Checks if conditions match (price drops, trends, etc.)
4. Executes trades if:
   ✅ Condition matches
   ✅ Cooldown period has passed
5. Logs everything to database
```

---

## 🎯 Response Format

### Success:
```json
{
  "ok": true,
  "checked": 5,
  "triggered": ["rule_123", "rule_456"],
  "errors": []
}
```

### Failure:
```json
{
  "ok": false,
  "error": "Error message here"
}
```

---

## 🔐 Security

The poller requires authentication:
- **Token**: `cron_5d8f1b8b7f2a4c3e9e2d1c0a7b8d6f4a`
- Without this token, the API returns `401 Unauthorized`

---

## ✅ Testing Checklist

- [ ] Test on localhost (method 1 or 2)
- [ ] Test on production (method 1 or 2)
- [ ] Verify GitHub Actions manual trigger works
- [ ] Wait for automatic run at midnight UTC
- [ ] Check logs in admin UI or database

---

## 🐛 Troubleshooting

### Local not working?
- Make sure dev server is running: `npm run dev`
- Check if port 3000 is available

### Production not working?
- Verify deployment is live on Vercel
- Check Vercel function logs
- Ensure environment variables are set

### No trades executing?
- Check if you have ACTIVE rules
- Verify cooldown periods haven't blocked execution
- Check if price conditions are actually met

---

## 📈 Monitoring

View execution logs:
- **Admin UI**: Check the poller page after running
- **Database**: Query the `logs` table for `action='poller_checked'`
- **GitHub**: View workflow runs in Actions tab

---

## 🎉 Quick Start

**Fastest way to test:**

1. Start dev server: `npm run dev`
2. Open: `http://localhost:3000/admin/poller`
3. Click: **Run Poller Now**
4. See results instantly! ✨
