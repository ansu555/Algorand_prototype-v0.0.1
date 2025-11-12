# Agent Wallet System

## Overview

The Agent Wallet system provides each user with a dedicated Algorand wallet for automated trading and autopilot features. This enables transactions to execute without requiring manual approval for each operation.

## How It Works

### 1. **Automatic Creation**
- When a user connects their main wallet, an agent wallet is automatically created
- Each user gets a unique agent wallet tied to their main wallet address
- The agent wallet's private key is encrypted and stored securely in the database

### 2. **Security**
- Agent wallet mnemonics are encrypted using AES-256-GCM encryption
- Encryption key is stored in environment variables (`AGENT_WALLET_ENCRYPTION_KEY`)
- Only accessible through the user's main wallet address
- Each agent wallet is isolated and cannot be accessed by other users

### 3. **Asset Support**
The agent wallet supports ALL Algorand Standard Assets (ASAs):
- **ALGO** - Native Algorand token (always supported)
- **USDC** - USD Coin (Asset ID: 10458941 on testnet)
- **USDT** - Tether USD
- **ALGF** - AlgoFund
- **Any other ASA** - Automatically opts-in when needed

### 4. **Opt-In Mechanism**
Before holding any ASA, the wallet must "opt-in":
- Automatic opt-in happens when needed (e.g., before receiving tokens)
- Each opt-in costs 0.1 ALGO (Algorand minimum balance requirement)
- Minimum balance formula: `0.1 ALGO + (0.1 ALGO × number of opted-in assets)`

## Architecture

### Database Schema
```sql
CREATE TABLE agent_wallets (
  id TEXT PRIMARY KEY,
  userAddress TEXT NOT NULL UNIQUE,
  agentAddress TEXT NOT NULL UNIQUE,
  encryptedMnemonic TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  lastUsedAt TEXT
)
```

### API Endpoints

#### `GET /api/agent/wallet?userAddress=XXX`
Get or create an agent wallet for a user.

**Response:**
```json
{
  "success": true,
  "agentAddress": "ABC123...",
  "isNew": false,
  "accountInfo": {
    "address": "ABC123...",
    "algoBalance": 1.5,
    "minBalance": 0.2,
    "availableBalance": 1.3,
    "assets": [
      {
        "assetId": 10458941,
        "symbol": "USDC",
        "balance": "100.0",
        "decimals": 6
      }
    ],
    "totalAssets": 1
  },
  "network": "testnet"
}
```

#### `POST /api/agent/wallet/opt-in`
Opt the agent wallet into an asset.

**Request:**
```json
{
  "userAddress": "USER123...",
  "assetId": 10458941
}
```

**Response:**
```json
{
  "success": true,
  "txId": "TRANSACTION_ID",
  "accountInfo": { ... },
  "message": "Successfully opted in"
}
```

## Usage Examples

### Frontend Component
```tsx
import { AgentWalletCard } from '@/components/features/wallet/agent-wallet-card'

function MyPage() {
  return <AgentWalletCard />
}
```

### Programmatic Access
```typescript
import { getOrCreateAgentWallet, buildUserAgentWallet } from '@/lib/agent-wallet'

// Get agent wallet info
const { agentAddress, agentMnemonic, isNew } = await getOrCreateAgentWallet(userAddress)

// Build agent instance
const agent = await buildUserAgentWallet(userAddress)

// Get balance
const usdcBalance = await agent.getBalance(10458941) // USDC asset ID

// Opt-in to asset
const txId = await agent.optInToAsset(10458941)

// Get full account info
const info = await agent.getAccountInfo()
```

## Funding the Agent Wallet

### Method 1: Manual Transfer
1. Copy the agent wallet address from the UI
2. Use your main wallet to send ALGO/assets
3. Refresh to see updated balance

### Method 2: Via MCP Server
```typescript
// User can say: "Send 10 USDC to my agent wallet"
// MCP will automatically:
// 1. Get user's agent address
// 2. Execute transfer from main wallet
// 3. Confirm transaction
```

## Integration with Autopilot Rules

When executing autopilot rules, the system now uses the agent wallet:

```typescript
// Before: Used shared agent (OA57...)
// After: Uses user's personal agent wallet

// In execute route:
const agent = await buildUserAgentWallet(rule.ownerAddress)
const swapResult = await agent.atomicSwap({ ... })
```

## Minimum Balance Requirements

| Scenario | Min Balance |
|----------|-------------|
| Empty wallet | 0.1 ALGO |
| + 1 ASA | 0.2 ALGO |
| + 2 ASAs | 0.3 ALGO |
| + N ASAs | 0.1 + (N × 0.1) ALGO |

**Example:**
- Want to hold ALGO + USDC + USDT?
- Need: 0.1 (base) + 0.1 (USDC) + 0.1 (USDT) = **0.3 ALGO minimum**

## Security Best Practices

### Production Deployment

1. **Change Encryption Key**
   ```bash
   # Generate a secure 32-byte key
   openssl rand -hex 32
   
   # Add to .env
   AGENT_WALLET_ENCRYPTION_KEY=your_generated_key_here
   ```

2. **Secure Database**
   - Use Turso or another secure database
   - Enable SSL/TLS
   - Restrict database access

3. **Environment Variables**
   - Never commit `.env.local` to git
   - Use secrets management in production
   - Rotate encryption keys periodically

### User Guidelines

1. **Only deposit funds you're comfortable using for automated trading**
2. **Set reasonable spending limits on autopilot rules**
3. **Monitor agent wallet transactions regularly**
4. **Withdraw unused funds back to main wallet**

## Troubleshooting

### "Insufficient balance" errors
- Check minimum balance requirements
- Ensure agent has enough ALGO for fees (0.001-0.002 ALGO per transaction)

### "Not opted in" errors
- Use the opt-in API endpoint or wait for automatic opt-in
- Each opt-in requires 0.1 ALGO

### Agent wallet not showing
- Ensure database migration has run: `POST /api/db/migrate?token=YOUR_SECRET`
- Check that user wallet is connected
- Verify `AGENT_WALLET_ENCRYPTION_KEY` is set

## Database Migration

Run migration to create agent_wallets table:

```bash
curl -X POST "http://localhost:3000/api/db/migrate?token=YOUR_MIGRATE_SECRET"
```

## Future Enhancements

- [ ] Withdrawal API endpoint
- [ ] Transaction history for agent wallet
- [ ] Multi-signature support
- [ ] Spending analytics
- [ ] Auto-rebalancing
- [ ] Asset swap directly from agent wallet
