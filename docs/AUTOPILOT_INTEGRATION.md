# AutoPilot Contract Integration - Usage Guide

## Overview
The AutoPilot contract integration is now fully wired into the `RuleBuilderModal` component, enabling users to create autopilot rules directly from the frontend.

## Architecture

### Files Created/Modified

1. **`src/lib/contracts/autopilot-types.ts`**
   - TypeScript interfaces matching the smart contract structs
   - Constants for rule types, trigger types, and statuses
   - Type definitions for all contract methods

2. **`src/lib/contracts/autopilot-client.ts`**
   - `AutoPilotRuleClient` class for blockchain interactions
   - Methods: `createRule()`, `executeRule()`, `updateRuleStatus()`, `deleteRule()`
   - Automatic transaction composition, grouping, and signing

3. **`src/lib/contracts/autopilot-helpers.ts`**
   - `convertFormToContractParams()` - Converts UI form data to contract parameters
   - `TESTNET_ASSET_MAP` - Maps coin symbols to Algorand asset IDs
   - Utility functions for formatting (microalgos, basis points, etc.)

4. **`src/components/features/rules/rule-builder-modal.tsx`** (Modified)
   - Integrated wallet connection check
   - Added `AutoPilotRuleClient` initialization
   - Updated `handleSave()` to create rules on-chain
   - Added loading states and error handling
   - Toast notifications for user feedback

## How It Works

### User Flow

1. **Connect Wallet**
   - User must connect their Algorand wallet (Pera, Defly, Exodus, Lute)
   - Wallet connection handled by `TxnLabWalletProvider`

2. **Fill Rule Form**
   - Strategy: DCA, Rebalance, or Rotate Top N
   - Coins: Select target assets (ALGO, USDC, etc.)
   - Trigger: Price drop, Trend, or Momentum
   - Risk Controls: Max spend, slippage, cooldown

3. **Create Rule**
   - Click "Save Rule" button
   - Form data is converted to contract parameters
   - Two transactions are created and grouped:
     - Payment: 0.165 ALGO for box storage (MBR)
     - App Call: `create_rule` method with parameters
   - User signs transactions via wallet
   - Transactions are submitted to blockchain
   - Success toast shows Rule ID and Transaction ID

### Code Example

```tsx
import { RuleBuilderModal } from '@/components/features/rules/rule-builder-modal'

export default function AutoPilotPage() {
  const handleRuleSaved = (rule: BuiltRule) => {
    console.log('Rule created on blockchain:', rule)
    // Refresh rules list, navigate, etc.
  }

  return (
    <RuleBuilderModal
      trigger={<Button>Create Autopilot Rule</Button>}
      onSave={handleRuleSaved}
      initialCoins={['ALGO', 'USDC']}
    />
  )
}
```

## Contract Parameters Mapping

### Form Data → Contract Parameters

| UI Field | Contract Parameter | Conversion |
|----------|-------------------|------------|
| `strategy` | `ruleType` | DCA=1, REBALANCE=2, ROTATE=3 |
| `coins` | `targetAssets` | Symbol → Asset ID via TESTNET_ASSET_MAP |
| `triggerType` | `triggerType` | priceDrop=1, trend=2, momentum=3 |
| `dropPercent` | `thresholdBps` | Percentage × 100 (5% → 500 bps) |
| `maxSpendUsd` | `maxSpendMicroalgos` | USD × 1,000,000 |
| `maxSlippagePercent` | `maxSlippageBps` | Percentage × 100 (0.5% → 50 bps) |
| `cooldownMinutes` | `cooldownMinutes` | Direct mapping |

## Transaction Details

### Create Rule Transaction Group

1. **Payment Transaction**
   - From: User's wallet address
   - To: AutoPilot contract address
   - Amount: 165,000 microALGOs (0.165 ALGO)
   - Purpose: Box storage MBR

2. **Application Call Transaction**
   - From: User's wallet address
   - App ID: 749361072 (testnet)
   - Method: `create_rule`
   - Arguments:
     - Rule type (uint8)
     - Target assets (uint64[])
     - Rotate top N (uint8)
     - Max spend (uint64)
     - Max slippage (uint16)
     - Cooldown minutes (uint16)
     - Trigger type (uint8)
     - Threshold (uint16)
     - Window hours (uint16)

## Error Handling

### Common Errors

1. **"Please connect your wallet"**
   - User must connect wallet before creating rules
   - Check `isConnected` state

2. **"AutoPilot client not initialized"**
   - Contract configuration missing or network mismatch
   - Check `contracts.ts` for autopilotRule config

3. **"Asset ID not found for coin"**
   - Coin symbol not in TESTNET_ASSET_MAP
   - Add mapping in `autopilot-helpers.ts`

4. **"Transaction failed"**
   - Insufficient balance (need 0.165+ ALGO)
   - User rejected signature
   - Contract logic rejected parameters

## Testing

### Manual Testing Steps

1. Start development server: `npm run dev`
2. Navigate to autopilot page
3. Connect wallet (ensure testnet, 0.5+ ALGO balance)
4. Click "Create Autopilot Rule"
5. Fill form:
   - Strategy: DCA
   - Coins: ALGO, USDC
   - Trigger: Price drop 5%
   - Max spend: 10 USD
   - Slippage: 0.5%
   - Cooldown: 60 minutes
6. Click "Save Rule"
7. Approve transactions in wallet
8. Verify success toast with Rule ID and TX ID
9. Check AlgoExplorer for transaction confirmation

### Verification

- Transaction: `https://testnet.algoexplorer.io/tx/{txId}`
- Application: `https://testnet.algoexplorer.io/application/749361072`
- Account: `https://testnet.algoexplorer.io/address/{userAddress}`

## Next Steps

### Recommended Enhancements

1. **Rule Listing UI**
   - Create component to display user's rules
   - Fetch rules from blockchain using box storage
   - Show rule status, execution stats, history

2. **Rule Management**
   - Pause/Resume buttons → `updateRuleStatus()`
   - Delete button → `deleteRule()`
   - Edit functionality (delete + recreate)

3. **Enhanced Asset Mapping**
   - Fetch asset IDs dynamically from API
   - Support mainnet asset mappings
   - Validate asset IDs before submission

4. **Execution Monitoring**
   - Listen for rule execution events
   - Display execution history
   - Show P&L and performance metrics

5. **ABI Decoding**
   - Implement `getRule()` ABI decoding
   - Implement `getRuleStats()` decoding
   - Use `@algorandfoundation/algokit-utils` for proper struct parsing

6. **Price Oracle Integration**
   - Connect to real price feeds
   - Validate trigger conditions
   - Show estimated execution scenarios

## Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_ALGORAND_NETWORK=testnet
ALGORAND_NETWORK=testnet
```

### Contract Configuration

Location: `src/lib/config/contracts.ts`

```typescript
autopilotRule: {
  appId: 749361072,
  address: 'QHYMQJWOQ7MNWYXHQEDLXLWHPDMLP5A65BLYECZ47RCGZ2YZSYERYRI244',
}
```

## Resources

- **Smart Contract**: `artifacts/autopilot_rule/AutoPilotRuleContract.arc56.json`
- **Deployed Address**: QHYMQJWOQ7MNWYXHQEDLXLWHPDMLP5A65BLYECZ47RCGZ2YZSYERYRI244
- **App ID (Testnet)**: 749361072
- **AlgoExplorer**: https://testnet.algoexplorer.io/application/749361072
- **Documentation**: `docs/DEPLOYED_CONTRACTS.md`
