# Environment Setup Guide

This guide helps you set up your `.env` file for local development.

## Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your credentials** (see sections below)

3. **Start the app:**
   ```bash
   npm run dev
   ```

---

## Configuration Steps

### 1. Algorand Wallet Setup 🔑

**Get a Testnet Wallet:**
1. Go to [Algorand Testnet Dispenser](https://testnet.algoexplorer.io/dispenser)
2. Create a new wallet or use an existing one
3. Get free testnet ALGO from the dispenser
4. Copy your 25-word mnemonic phrase
5. Paste it into `ALGORAND_MNEMONIC` in `.env`

**⚠️ Security Warning:** 
- NEVER commit your real mnemonic to git
- NEVER use mainnet keys in `.env` files
- Use testnet keys for development only

---

### 2. Deploy AutoPilot Contract 📝

**Deploy your smart contract:**
```bash
cd Blockchain/projects/10x_Swap
npm install
npm run deploy:testnet
```

After deployment, copy the App ID from the output and paste it into:
```env
NEXT_PUBLIC_AUTOPILOT_CONTRACT_APP_ID=your_app_id_here
```

---

### 3. WalletConnect Project ID 🔗

**Get your Project ID:**
1. Sign up at [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy the Project ID
4. Paste into `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

---

### 4. CoinGecko API Key 📊

**Get your API key:**
1. Sign up at [CoinGecko](https://www.coingecko.com/en/api/pricing)
2. Free tier works fine for development
3. Copy your API key
4. Paste into `NEXT_PUBLIC_COINGECKO_API_KEY`

**Note:** Free tier has rate limits. Upgrade if needed.

---

### 5. AI Provider (Optional) 🤖

Choose one provider:

**Option A: OpenRouter** (Recommended)
1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Get API key from [Keys page](https://openrouter.ai/keys)
3. Paste into `OPENROUTER_API_KEY`
4. Set `AI_PROVIDER=openrouter`

**Option B: OpenAI**
1. Sign up at [OpenAI](https://platform.openai.com/)
2. Get API key from [API Keys](https://platform.openai.com/api-keys)
3. Paste into `OPENAI_API_KEY`
4. Set `AI_PROVIDER=openai`

---

### 6. Turso Database 💾

**Set up your database:**
1. Sign up at [Turso](https://turso.tech/)
2. Create a new database:
   ```bash
   turso db create algorand-app
   ```
3. Get your database URL:
   ```bash
   turso db show algorand-app --url
   ```
4. Create an auth token:
   ```bash
   turso db tokens create algorand-app
   ```
5. Paste both into `.env`:
   ```env
   TURSO_DATABASE_URL=libsql://your-database.turso.io
   TURSO_AUTH_TOKEN=your_token_here
   ```

**Initialize database:**
```bash
npm run db:migrate
```

---

### 7. Generate Secrets 🔐

**CRON_SECRET & MIGRATE_SECRET:**

Generate random secrets:
```bash
# macOS/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the generated values:
```env
CRON_SECRET=your_generated_secret_here
NEXT_PUBLIC_CRON_SECRET=your_generated_secret_here
MIGRATE_SECRET=your_other_generated_secret_here
```

---

### 8. MCP Analytics Server (Optional) 📈

If you're running the Model Context Protocol analytics server:

```env
MCP_ANALYTICS_URL=http://localhost:8080
MCP_BASE_URL=http://localhost:8080
MCP_ANALYTICS_API_KEY=your_mcp_key_here
MCP_PORT=8080
```

To start the MCP server:
```bash
npm run mcp:server
```

---

## Verification

**Check your setup:**
```bash
npm run env:check
```

**Test Algorand connection:**
```bash
npm run test:algorand
```

**Test asset discovery:**
```bash
npm run test:assets
```

---

## Production Deployment (Vercel)

**Set environment variables in Vercel:**

1. Go to your project settings in Vercel
2. Navigate to **Environment Variables**
3. Add ALL variables from your `.env` file
4. **Important:** Use production values, not development ones!

**Required for production:**
- Change `ALGORAND_NETWORK=mainnet` (if deploying to mainnet)
- Use mainnet App ID
- Use production database
- Rotate all secrets

---

## Troubleshooting

### "Missing env variable" error
- Make sure you copied `.env.example` to `.env`
- Check that all required variables are filled in
- Restart your dev server: `npm run dev`

### "Invalid mnemonic" error
- Check that your mnemonic has exactly 25 words
- Make sure it's wrapped in quotes
- No extra spaces or line breaks

### "Database connection failed"
- Verify Turso credentials are correct
- Check if database exists: `turso db list`
- Run migrations: `npm run db:migrate`

### "CoinGecko rate limit"
- Free tier has limits (10-50 calls/minute)
- Upgrade your plan if needed
- Add delays between requests

---

## Security Best Practices

✅ **DO:**
- Use `.env.example` for templates
- Keep `.env` in `.gitignore`
- Use testnet keys for development
- Rotate secrets regularly
- Use different credentials per environment

❌ **DON'T:**
- Commit `.env` to git
- Share your mnemonic with anyone
- Use mainnet keys in development
- Reuse secrets across projects
- Store secrets in code

---

## Need Help?

- Check the [main README](../README.md)
- Review [architecture docs](../docs/)
- Open an issue on GitHub
- Contact the team

---

**Ready?** Copy `.env.example` to `.env` and start configuring! 🚀
