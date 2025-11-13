# Execute Route Fix - Self-Transfer Bug Resolution

## Problem
The execute button was creating transactions where **sender = receiver = shared agent address** (OA57DAFKUMATT3WK3DPJP7XZEFIXHRN7DAWR72YTOKYECVI3AOP2VYJQIE), instead of transferring from the user's personal agent wallet to their main wallet.

## Root Cause
The execute route was using `getAgent()` which returns the **shared agent wallet** instead of the user's **personal agent wallet**.

## Solution Implemented

### 1. Added Transfer Method to UserAgentWallet
**File:** `src/lib/agent-wallet.ts`

Added a new `transfer()` method that handles both ALGO and ASA transfers:

```typescript
async function transfer(opts: {
  to: string
  assetId: number
  amount: number
  note?: string
}): Promise<{ txId: string; details: any }>
```

**Features:**
- Validates recipient address
- Validates amount > 0
- Handles ALGO transfers (assetId = 0)
- Handles ASA transfers (assetId > 0)
- Waits for confirmation (6 rounds)
- Returns transaction ID and explorer URL

### 2. Fixed Execute Route
**File:** `src/app/api/agent/execute/route.ts`

**Before:**
```typescript
const agent = await getAgent()  // ❌ Wrong - uses shared agent
const swapResult = await atomicSwap({...})  // ❌ Sends from shared agent
```

**After:**
```typescript
const userAgent = await buildUserAgentWallet(normalizedRecipient)  // ✅ User's personal agent
const swapResult = await userAgent.transfer({
  to: normalizedRecipient,
  assetId: assetInfo.id,
  amount: spendAmount,
  note: `AutoPilot Rule ${ruleId} execution`
})  // ✅ Sends from user's agent to user's main wallet
```

### 3. Balance Check Fix
The balance check was also updated to check the **user's agent wallet** instead of the owner's main wallet:

```typescript
await ensureOwnerHasAssetBalance(
  userAgent.algodClient,
  userAgent.address,  // ✅ Checks agent wallet balance
  assetInfo,
  spendAmount
)
```

## Transaction Flow Now

1. **User connects wallet** → Personal agent wallet created (e.g., 2AXW6UGLRWFYWMMEDDSXLZJFGWEWUBKFTAQE673MZXAROURSE6E6OHWOMA)
2. **User funds agent wallet** → Deposits ALGO + assets to agent address
3. **Agent auto opts-in** → Opts into required assets if needed
4. **Rule triggers** → Executes transfer from agent wallet to user's main wallet
5. **Transaction completes** → Sender = agent wallet, Receiver = user's main wallet

## Testing Checklist

- [ ] User's agent wallet is created when they connect
- [ ] Agent wallet address is unique per user
- [ ] User can fund their agent wallet with ALGO
- [ ] Agent wallet auto opts-in to required assets
- [ ] Execute button transfers FROM agent wallet TO user's main wallet
- [ ] Transaction shows correct sender/receiver in explorer
- [ ] Multiple users have separate agent wallets

## Example Addresses

- **User's Main Wallet:** YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I
- **User's Agent Wallet:** 2AXW6UGLRWFYWMMEDDSXLZJFGWEWUBKFTAQE673MZXAROURSE6E6OHWOMA
- **Shared Agent (deprecated for user txs):** OA57DAFKUMATT3WK3DPJP7XZEFIXHRN7DAWR72YTOKYECVI3AOP2VYJQIE

## Next Steps

1. Fund your agent wallet with at least 0.5 ALGO
2. Use the opt-in button to opt into trading assets (USDC, USDT, ALGF)
3. Deposit the assets you want to trade into your agent wallet
4. Create autopilot rules
5. Execute will now correctly transfer from your agent to your main wallet

## Files Modified

- `src/lib/agent-wallet.ts` - Added `transfer()` method
- `src/app/api/agent/execute/route.ts` - Switched from shared agent to per-user agent wallet
