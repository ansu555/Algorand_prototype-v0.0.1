# Connecting Smart Contract Artifacts to Frontend

## Overview

This guide explains how to connect your deployed Algorand smart contracts to the frontend application.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  src/lib/config/contracts.ts                       │ │
│  │  - Contract App IDs                                │ │
│  │  - Contract Addresses                              │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  src/lib/contracts/artifacts.ts                    │ │
│  │  - Loads ARC56 JSON specs                          │ │
│  │  - Provides contract ABIs                          │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  src/lib/contracts/multihop-swap-client.ts        │ │
│  │  - Contract interaction methods                    │ │
│  │  - Transaction building                            │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Algorand Blockchain (Testnet)              │
│                                                          │
│  MultihopSwapRouter (App ID: XXXX)                      │
│  TinymanPoolAdapter (App ID: YYYY)                      │
│  PactPoolAdapter    (App ID: ZZZZ)                      │
└─────────────────────────────────────────────────────────┘
```

## Step-by-Step Integration

### Step 1: Deploy Smart Contracts

First, deploy your smart contracts using the deployment scripts:

```bash
# Deploy Tinyman Adapter
cd Blockchain/projects/10x_Swap/smart_contracts/multihop_swap
python deploy_tinyman_adapter.py

# Deploy Pact Adapter
python deploy_pact_adapter.py

# Deploy MultihopSwapRouter
python deploy_router.py

# Deploy AutoPilot Rule Contract (optional)
cd ../autopilot_rule
python deploy_config.py
```

**Save the App IDs** that are printed after each deployment. You'll need them in the next step.

### Step 2: Update Contract Configuration

Edit `src/lib/config/contracts.ts` and add your deployed App IDs:

```typescript
export function getContractConfig(network: 'mainnet' | 'testnet'): ContractConfig {
  if (network === 'testnet') {
    return {
      multihopRouter: {
        appId: 123456789, // ← Replace with your MultihopSwapRouter App ID
        address: 'ALGO_ADDRESS_HERE',
      },
      adapters: {
        tinyman: {
          appId: 987654321, // ← Replace with TinymanPoolAdapter App ID
          address: 'ALGO_ADDRESS_HERE',
          enabled: true,
        },
        pact: {
          appId: 111222333, // ← Replace with PactPoolAdapter App ID
          address: 'ALGO_ADDRESS_HERE',
          enabled: true,
        },
      },
    };
  }
  // ...
}
```

**To get the contract addresses:**
```bash
# Run this Python script to get the addresses
python -c "import algosdk; print(algosdk.logic.get_application_address(YOUR_APP_ID))"
```

### Step 3: Verify Artifacts Are Accessible

The frontend needs to import the ARC56 contract specs. Verify they exist:

```bash
ls -la artifacts/multihop_swap/
# Should show:
# - MultihopSwapRouter.arc56.json
# - TinymanPoolAdapter.arc56.json
# - PactPoolAdapter.arc56.json

ls -la artifacts/autopilot_rule/
# Should show:
# - AutoPilotRuleContract.arc56.json
```

### Step 4: Use the Contract Client in Your Frontend

Example: Integrate the MultihopSwapClient into your swap execution logic:

```typescript
// In your swap execution component or API route
import { MultihopSwapClient } from '@/lib/contracts/multihop-swap-client';
import algosdk from 'algosdk';

// Initialize Algod client
const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN!,
  process.env.ALGOD_SERVER!,
  process.env.ALGOD_PORT || '443'
);

// Create contract client
const swapClient = new MultihopSwapClient(algodClient, 'testnet');

// Check if contract is deployed
const isDeployed = await swapClient.isDeployed();
if (!isDeployed) {
  console.error('Contract not deployed!');
  return;
}

// Execute a 2-hop swap
const txnId = await swapClient.executeSwap2Hop({
  inputAsset: 0, // ALGO
  intermediateAsset: 10458941, // USDC
  outputAsset: 312769, // USDT
  pool1AppId: 552635992, // Tinyman ALGO/USDC pool
  pool2AppId: 792313023, // Tinyman USDC/USDT pool
  amountIn: BigInt(1_000_000), // 1 ALGO
  minAmountOut: BigInt(900_000), // Min 0.9 USDT
  userAddress: 'YOUR_WALLET_ADDRESS',
});
```

### Step 5: Update Your Swap Router

Integrate the contract client into your existing swap router:

```typescript
// In src/lib/routing/swap-router.ts
import { MultihopSwapClient } from '../contracts/multihop-swap-client';

export class SwapRouter {
  private contractClient: MultihopSwapClient;

  constructor(dexClients: IDexClient[], algodClient: algosdk.Algodv2) {
    // ... existing initialization
    this.contractClient = new MultihopSwapClient(algodClient, 'testnet');
  }

  async executeSwap(quote: SwapQuote, userAddress: string): Promise<SwapResult> {
    // Check if we should use the on-chain router
    if (quote.route.hops.length > 1) {
      // Use the MultihopSwapRouter contract for multi-hop swaps
      const txnId = await this.contractClient.executeSwap2Hop({
        inputAsset: quote.assetIn.id,
        intermediateAsset: quote.route.hops[0].assetOut.id,
        outputAsset: quote.assetOut.id,
        pool1AppId: quote.route.hops[0].poolId,
        pool2AppId: quote.route.hops[1].poolId,
        amountIn: BigInt(quote.amountIn),
        minAmountOut: BigInt(quote.amountOut),
        userAddress,
      });

      return {
        success: true,
        txHash: txnId,
        amountOut: quote.amountOut,
      };
    }

    // Use direct DEX swap for 1-hop
    return this.executeDirect(quote, userAddress);
  }
}
```

### Step 6: Environment Variables

Ensure your `.env.local` file has the necessary Algorand configuration:

```bash
# Algorand Node Configuration
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
ALGOD_PORT=443

# Deployer Account (for deployment only)
DEPLOYER_MNEMONIC="your 25 word mnemonic phrase here"
```

### Step 7: Test the Integration

Create a test script to verify everything is connected:

```typescript
// scripts/test-contract-integration.ts
import { MultihopSwapClient } from '../src/lib/contracts/multihop-swap-client';
import { getContractConfig } from '../src/lib/config/contracts';
import algosdk from 'algosdk';

async function testIntegration() {
  const algodClient = new algosdk.Algodv2(
    '',
    'https://testnet-api.algonode.cloud',
    ''
  );

  const client = new MultihopSwapClient(algodClient, 'testnet');
  
  console.log('Testing contract integration...');
  
  const isDeployed = await client.isDeployed();
  console.log('Contract deployed:', isDeployed);
  
  if (isDeployed) {
    const appInfo = await client.getApplicationInfo();
    console.log('App Info:', appInfo);
  }
  
  const config = getContractConfig('testnet');
  console.log('Config:', JSON.stringify(config, null, 2));
}

testIntegration();
```

Run it:
```bash
npx tsx scripts/test-contract-integration.ts
```

## What Each File Does

### 1. `src/lib/config/contracts.ts`
- **Purpose**: Central configuration for deployed contracts
- **Contains**: App IDs, addresses, network-specific configs
- **Updated**: After each contract deployment

### 2. `src/lib/contracts/artifacts.ts`
- **Purpose**: Loads compiled contract artifacts (ARC56 specs)
- **Provides**: Contract ABIs, method signatures, type information
- **Source**: Imports from `/artifacts/` directory

### 3. `src/lib/contracts/multihop-swap-client.ts`
- **Purpose**: High-level API for interacting with MultihopSwapRouter
- **Methods**: `executeSwap2Hop()`, `executeSwap1Hop()`, `getApplicationInfo()`
- **Handles**: Transaction building, encoding, submission

## Benefits of This Architecture

✅ **Type Safety**: TypeScript interfaces for all contract interactions
✅ **Testability**: Easy to mock contract clients for testing
✅ **Maintainability**: Centralized contract configuration
✅ **Network Support**: Easy switching between testnet/mainnet
✅ **Developer Experience**: Clear separation of concerns

## Next Steps

1. ✅ Deploy all contracts and note their App IDs
2. ✅ Update `src/lib/config/contracts.ts` with App IDs
3. ✅ Test contract connectivity
4. ✅ Integrate into your swap execution flow
5. ✅ Add error handling and user feedback
6. ✅ Deploy to production (mainnet) when ready

## Troubleshooting

### Problem: "Contract not deployed" error
**Solution**: Verify your App IDs in `contracts.ts` are correct

### Problem: "Module not found" for artifacts
**Solution**: Ensure artifacts exist at `artifacts/multihop_swap/*.arc56.json`

### Problem: Transaction fails with "invalid app ID"
**Solution**: Check that the App ID corresponds to the correct network (testnet/mainnet)

### Problem: ABI method not found
**Solution**: Verify your contract methods match the ARC56 spec exactly
