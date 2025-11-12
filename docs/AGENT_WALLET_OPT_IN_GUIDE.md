# Agent Wallet Opt-In Issue - Solution Guide

## Problem

When trying to send USDC (or any ASA) to your agent wallet, you see:
- ⚠️ "The recipient is not opted-in to the asset"
- Transaction shows as "Application Call" to contract `643020148`
- No direct transfer happens - uses Inbox Router instead

## Root Cause

Your **agent wallet hasn't opted into USDC yet**, and it **has 0 ALGO** so it can't pay the opt-in fee.

## Solution Steps

### Step 1: Fund Your Agent Wallet with ALGO

Before your agent wallet can receive any assets (USDC, USDT, etc.), it needs ALGO for:
1. **Minimum balance**: 0.1 ALGO base + 0.1 ALGO per asset
2. **Transaction fees**: ~0.001-0.002 ALGO per transaction

**Recommended initial funding**: **0.5 ALGO**

#### How to Fund:
1. Go to `/agent-wallet` page
2. Copy your agent wallet address (e.g., `2AXW6UGLRW...`)
3. Open your main wallet (Pera, Defly, etc.)
4. Send 0.5 ALGO to that agent address
5. Wait for confirmation (~4 seconds)

### Step 2: Opt-In to Assets

Once your agent wallet has ALGO, click the **"Opt-in to All Trading Assets"** button on the agent wallet page.

This will:
- Opt into USDC (0.1 ALGO locked)
- Opt into USDT (0.1 ALGO locked)  
- Opt into ALGF (0.1 ALGO locked)
- Total: 0.3 ALGO locked (recoverable if you opt-out later)

### Step 3: Now You Can Receive Assets!

After opt-in completes:
- Send USDC directly to your agent address
- Transaction will be a simple "Asset Transfer"
- No more Inbox Router / Application Calls
- Shows properly in explorer

## Why This Happens

### Algorand Protocol Rules

1. **Opt-in required**: Every account must explicitly opt-in before holding an ASA
2. **Minimum balance**: Each opt-in locks 0.1 ALGO (anti-spam mechanism)
3. **Transaction fees**: Every transaction costs ~0.001 ALGO

### What is the Inbox Router?

When you send assets to an **un-opted-in** address, wallets like Pera use the **Inbox Router** (smart contract `643020148`) as a temporary holding place:

- Your USDC goes to the contract
- Recipient can "claim" it later (after opting in)
- This is a workaround, NOT the intended flow
- Costs more fees and creates complex transactions

## Testnet Addresses

- **Agent Wallet**: `2AXW6UGLRWFYWMMEDDSXLZJFGWEWUBKFTAQE673MZXAROURSE6E6OHWOMA`
- **User Wallet**: `YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I`
- **Inbox Router Contract**: `643020148`

## Auto Opt-In Feature

The execute route now **automatically opts in** when needed:

```typescript
// Before executing autopilot rule, agent wallet auto opts-in to required asset
if (assetInfo.id !== 0) {
  await userAgent.optInToAsset(assetInfo.id)
}
```

This means autopilot rules will work even if you haven't manually opted in - but you still need to fund the agent wallet with ALGO first!

## Cost Breakdown

| Action | Cost | Type |
|--------|------|------|
| Create agent wallet | Free | One-time |
| Fund with ALGO | Transfer fee ~0.001 | One-time |
| Opt-in to 1 asset | 0.1 ALGO locked + 0.001 fee | Per asset |
| Execute autopilot rule | 0.001-0.002 ALGO fee | Per execution |

**Example for trading ALGO + USDC + USDT:**
- Initial: 0.5 ALGO sent to agent
- Opt-ins: 0.2 ALGO locked (USDC + USDT)
- Available for trading: ~0.298 ALGO
- Plus whatever USDC/USDT you send!

## Quick Fix Command

```bash
# Opt-in via API (requires agent wallet to have ALGO first!)
curl -X POST "http://localhost:3000/api/agent/wallet/opt-in-all" \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"YOUR_MAIN_WALLET_ADDRESS"}'
```

## Prevention

To avoid this in the future:

1. **Always fund agent wallet first** (0.5+ ALGO)
2. **Use the "Opt-in" button** before sending assets
3. **Check agent balance** on `/agent-wallet` page
4. **Autopilot will auto opt-in** but needs ALGO for fees

## Summary

✅ **Required order:**
1. Create agent wallet (automatic)
2. Fund agent with 0.5 ALGO
3. Opt-in to trading assets
4. Send/receive assets normally
5. Execute autopilot rules

❌ **What happens if you skip steps:**
- No ALGO → Can't opt-in → Inbox Router used → Complex transactions
- Opted-in but no ALGO → Can't execute trades
- No opt-in but has ALGO → First trade will auto opt-in
