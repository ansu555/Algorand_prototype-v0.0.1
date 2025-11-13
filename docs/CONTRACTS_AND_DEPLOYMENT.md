# Smart Contracts & Deployment Guide

**Complete guide to 10xSwap smart contracts, deployment procedures, and blockchain integration.**

## Table of Contents

1. [Overview](#overview)
2. [Deployed Contracts](#deployed-contracts)
3. [Contract Architecture](#contract-architecture)
4. [Deployment Procedures](#deployment-procedures)
5. [Frontend Integration](#frontend-integration)
6. [Contract Verification](#contract-verification)
7. [Upgrade & Maintenance](#upgrade--maintenance)

---

## Overview

10xSwap uses four main smart contracts deployed on Algorand blockchain:

1. **MultihopSwapRouter** - Main routing contract for swaps
2. **TinymanPoolAdapter** - Adapter for Tinyman V2 DEX
3. **PactPoolAdapter** - Adapter for Pact Finance DEX
4. **AutoPilotRuleContract** - Automated trading rules

All contracts are written in **Python using AlgoPy** and compiled to **TEAL** (Transaction Execution Approval Language).

---

## Deployed Contracts

### Testnet Deployments

#### 1. MultihopSwapRouter
**Main router contract for executing multi-hop swaps across different DEXs**

- **App ID:** `749360450`
- **Address:** `OL7STUUNPYHLP3I73MG3ESSFWU2HGIFQ522TUOADK4WHD66W2T4A6M4B3Y`
- **Network:** Testnet
- **Transaction ID:** `W6JEYCEWVHLQTYRAQZJ433DVPXDV25L3PJ7ALTFA766CZ72PLQVA`
- **Deployer:** `YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I`
- **Explorer:** [View on AlgoScan](https://testnet.algoscan.app/app/749360450)

**Methods:**
- `execute_swap_2hop(pool1, pool2, adapter)` - Execute 2-hop swap
- `execute_swap_1hop(pool, adapter)` - Execute single-hop swap

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/multihop_swap/contract.py`
- TEAL: `artifacts/multihop_swap/MultihopSwapRouter.approval.teal`
- ABI: `artifacts/multihop_swap/MultihopSwapRouter.arc56.json`

---

#### 2. TinymanPoolAdapter
**Adapter contract for interacting with Tinyman V2 pools**

- **App ID:** `749360541`
- **Address:** `IRIK74M646IKDJV2F3QGMVTKHRGRH4PW7C7EOZV5YUYFNT2DYBFJVDJILM`
- **Network:** Testnet
- **DEX:** Tinyman V2
- **Transaction ID:** `I7BH4U4HHZZIURVDRKO4O3RUNRYPM2KMTELQVPXDSQEWX7DJ6RQA`
- **Deployer:** `YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I`
- **Status:** ✅ Enabled
- **Fee:** 30 bps (0.3%)
- **Explorer:** [View on AlgoScan](https://testnet.algoscan.app/app/749360541)

**Methods:**
- `swap()` - Execute swap via Tinyman pool
- Asset transfer handling

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/multihop_swap/tinyman_adapter.py`
- TEAL: `artifacts/multihop_swap/TinymanPoolAdapter.approval.teal`
- ABI: `artifacts/multihop_swap/TinymanPoolAdapter.arc56.json`

---

#### 3. PactPoolAdapter
**Adapter contract for interacting with Pact Finance pools**

- **App ID:** `749341932`
- **Address:** `5MF2XA5DFO2JKZCSNRGO64LYADV7ZUSF4VE2ZQFPUKPRGG2ZOLBIUOITQU`
- **Network:** Testnet
- **DEX:** Pact Finance
- **Transaction ID:** `4DOBHUDTL26N5ZWRPYSGZNIP5NBVJIKRSYYVJHHSQ65AG5QAD7LA`
- **Deployer:** `YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I`
- **Status:** ✅ Enabled
- **Fee:** 25 bps (0.25%)
- **Explorer:** [View on AlgoScan](https://testnet.algoscan.app/app/749341932)

**Methods:**
- `swap_fixed_input()` - Fixed input swap
- `swap_algo_to_asa()` - ALGO to ASA swap
- `swap_asa_to_algo()` - ASA to ALGO swap

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/multihop_swap/pact_adapter.py`
- TEAL: `artifacts/multihop_swap/PactPoolAdapter.approval.teal`
- ABI: `artifacts/multihop_swap/PactPoolAdapter.arc56.json`

---

#### 4. AutoPilotRuleContract
**Smart contract for automated trading rules and conditions**

- **App ID:** `749361072`
- **Address:** `QHYMQJWOQ7MNWYXHQEDLXLWHPDMLP5A65BLYECZ47RCGZ2YZSYERYRI244`
- **Network:** Testnet
- **Transaction ID:** `M4TKRHK6LL66VO7TZOXOQME3ZJPKYSA2G7C56CNOSWA2WI7EC4VA`
- **Funding Transaction:** `HR57KURGXSPWCR7VMKRMZRJNQQG5WHBUVG2OJCEESVNJXLI6QTBQ`
- **Deployer:** `OA57DAFKUMATT3WK3DPJP7XZEFIXHRN7DAWR72YTOKYECVI3AOP2VYJQIE`
- **Explorer:** [View on AlgoScan](https://testnet.algoscan.app/app/749361072)

**Methods:**
- `create_rule()` - Create new trading rule
- `execute_rule()` - Execute rule if conditions met
- `delete_rule()` - Remove trading rule

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/autopilot_rule/contract.py`
- TEAL: `artifacts/autopilot_rule/AutoPilotRuleContract.approval.teal`
- ABI: `artifacts/autopilot_rule/AutoPilotRuleContract.arc56.json`

---

### Mainnet Deployments

⚠️ **Mainnet contracts not yet deployed.** Follow deployment procedures below when ready.

---

## Contract Architecture

### System Design

```
┌────────────────────────────────────────────────────┐
│         MultihopSwapRouter (Main Contract)         │
│                                                    │
│  Responsibilities:                                 │
│  • Receives user assets                           │
│  • Routes to appropriate adapter                  │
│  • Validates minimum output                       │
│  • Returns swapped assets to user                 │
│                                                    │
│  Methods:                                          │
│  • execute_swap_2hop(pool1, pool2, adapter)       │
│  • execute_swap_1hop(pool, adapter)               │
└────────────┬───────────────────┬────────────────────┘
             │                   │
    ┌────────▼────────┐  ┌──────▼─────────┐
    │ TinymanAdapter  │  │  PactAdapter   │
    │                 │  │                │
    │ Responsibilities│  │ Responsibilities│
    │ • Tinyman ABI   │  │ • Pact ABI     │
    │ • Pool calls    │  │ • Pool calls   │
    │ • Asset routing │  │ • Asset routing │
    └─────────────────┘  └────────────────┘
```

### Swap Transaction Flow

```
1. User submits swap request
   ↓
2. Frontend calls MultihopSwapRouter
   ↓
3. Router determines which adapter to use
   ↓
4. Calls appropriate adapter (Tinyman or Pact)
   ↓
5. Adapter interacts with DEX pool
   ↓
6. Assets swapped on-chain
   ↓
7. Router validates minimum output
   ↓
8. Returns swapped assets to user
```

### Asset Transfer Pattern

All swaps follow atomic transaction groups:

```
Transaction Group:
┌─────────────────────────────────────┐
│ Txn 0: Asset Transfer               │
│   From: User                        │
│   To: MultihopSwapRouter            │
│   Asset: Input ASA                  │
│   Amount: Input amount              │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Txn 1: Application Call             │
│   App: MultihopSwapRouter           │
│   Method: execute_swap_2hop()       │
│   Args:                             │
│     - pool_app_id                   │
│     - adapter_app_id                │
│     - min_output                    │
└─────────────────────────────────────┘
```

---

## Deployment Procedures

### Prerequisites

**Required:**
- Python 3.10+
- AlgoPy installed (`pip install algokit`)
- Algorand wallet with ALGO for deployment
- Testnet/mainnet access

**Environment Setup:**
```bash
# Set deployer mnemonic
export DEPLOYER_MNEMONIC="word1 word2 ... word25"

# Set network
export ALGORAND_NETWORK="testnet"  # or "mainnet"
```

### Deployment Steps

#### 1. Deploy MultihopSwapRouter

```bash
cd Blockchain/projects/10x_Swap/smart_contracts/multihop_swap

# Deploy router
python deploy_router.py
```

**Expected Output:**
```
✅ Router deployed
   App ID: 749360450
   Address: OL7STUUNPYHLP3I73MG3ESSFWU2HGIFQ522TUOADK4WHD66W2T4A6M4B3Y
   Txn ID: W6JEYCEWVHLQTYRAQZJ433DVPXDV25L3PJ7ALTFA766CZ72PLQVA
```

**Save the App ID** - you'll need it for frontend configuration.

---

#### 2. Deploy TinymanPoolAdapter

```bash
# Deploy Tinyman adapter
python deploy_tinyman_adapter.py
```

**Expected Output:**
```
✅ Tinyman Adapter deployed
   App ID: 749360541
   Address: IRIK74M646IKDJV2F3QGMVTKHRGRH4PW7C7EOZV5YUYFNT2DYBFJVDJILM
   Txn ID: I7BH4U4HHZZIURVDRKO4O3RUNRYPM2KMTELQVPXDSQEWX7DJ6RQA
```

---

#### 3. Deploy PactPoolAdapter

```bash
# Deploy Pact adapter
python deploy_pact_adapter.py
```

**Expected Output:**
```
✅ Pact Adapter deployed
   App ID: 749341932
   Address: 5MF2XA5DFO2JKZCSNRGO64LYADV7ZUSF4VE2ZQFPUKPRGG2ZOLBIUOITQU
   Txn ID: 4DOBHUDTL26N5ZWRPYSGZNIP5NBVJIKRSYYVJHHSQ65AG5QAD7LA
```

---

#### 4. Deploy AutoPilotRuleContract

```bash
cd ../autopilot_rule

# Deploy autopilot contract
python deploy_config.py
```

**Expected Output:**
```
✅ AutoPilot Contract deployed
   App ID: 749361072
   Address: QHYMQJWOQ7MNWYXHQEDLXLWHPDMLP5A65BLYECZ47RCGZ2YZSYERYRI244
   Txn ID: M4TKRHK6LL66VO7TZOXOQME3ZJPKYSA2G7C56CNOSWA2WI7EC4VA
```

---

#### 5. Fund Contracts (if needed)

Some contracts require minimum balance:

```bash
# Fund router with 1 ALGO
algokit goal clerk send \
  --from YOUR_WALLET \
  --to OL7STUUNPYHLP3I73MG3ESSFWU2HGIFQ522TUOADK4WHD66W2T4A6M4B3Y \
  --amount 1000000

# Fund adapters
algokit goal clerk send \
  --from YOUR_WALLET \
  --to IRIK74M646IKDJV2F3QGMVTKHRGRH4PW7C7EOZV5YUYFNT2DYBFJVDJILM \
  --amount 1000000
```

---

#### 6. Opt Contracts Into Assets

Contracts must opt into assets they'll handle:

```typescript
import algosdk from 'algosdk';

// Example: Opt adapter into USDC
const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
  from: adapterAddress,
  to: adapterAddress,
  amount: 0,
  assetIndex: 10458941, // USDC testnet
  suggestedParams,
});

// Sign and submit
```

---

### Deployment Scripts Reference

| Script | Purpose | Location |
|--------|---------|----------|
| `deploy_router.py` | Deploy MultihopSwapRouter | `smart_contracts/multihop_swap/` |
| `deploy_tinyman_adapter.py` | Deploy Tinyman adapter | `smart_contracts/multihop_swap/` |
| `deploy_pact_adapter.py` | Deploy Pact adapter | `smart_contracts/multihop_swap/` |
| `deploy_config.py` | Deploy AutoPilot contract | `smart_contracts/autopilot_rule/` |

---

## Frontend Integration

### Configuration Files

Update these files after deployment:

#### 1. Contract Configuration

**File:** `src/lib/config/contracts.ts`

```typescript
export function getContracts(): ContractConfig {
  const network = process.env.NEXT_PUBLIC_ALGORAND_NETWORK || 'testnet';
  
  if (network === 'testnet') {
    return {
      multihopRouter: {
        appId: 749360450,
        address: 'OL7STUUNPYHLP3I73MG3ESSFWU2HGIFQ522TUOADK4WHD66W2T4A6M4B3Y'
      },
      adapters: {
        tinyman: {
          appId: 749360541,
          address: 'IRIK74M646IKDJV2F3QGMVTKHRGRH4PW7C7EOZV5YUYFNT2DYBFJVDJILM',
          enabled: true
        },
        pact: {
          appId: 749341932,
          address: '5MF2XA5DFO2JKZCSNRGO64LYADV7ZUSF4VE2ZQFPUKPRGG2ZOLBIUOITQU',
          enabled: true
        }
      },
      autopilot: {
        appId: 749361072,
        address: 'QHYMQJWOQ7MNWYXHQEDLXLWHPDMLP5A65BLYECZ47RCGZ2YZSYERYRI244'
      }
    };
  }
  
  // Mainnet config (deploy contracts first)
  return {
    multihopRouter: { appId: 0, address: '' },
    adapters: {
      tinyman: { appId: 0, address: '', enabled: false },
      pact: { appId: 0, address: '', enabled: false }
    },
    autopilot: { appId: 0, address: '' }
  };
}
```

---

#### 2. Environment Variables

**File:** `.env`

```env
# Smart Contract App IDs
NEXT_PUBLIC_MULTIHOP_ROUTER_APP_ID=749360450
NEXT_PUBLIC_TINYMAN_ADAPTER_APP_ID=749360541
NEXT_PUBLIC_PACT_ADAPTER_APP_ID=749341932
NEXT_PUBLIC_AUTOPILOT_CONTRACT_APP_ID=749361072
```

---

#### 3. Contract Artifacts

**File:** `src/lib/contracts/artifacts.ts`

```typescript
import multihopRouterSpec from '@/../../artifacts/multihop_swap/MultihopSwapRouter.arc56.json';
import tinymanAdapterSpec from '@/../../artifacts/multihop_swap/TinymanPoolAdapter.arc56.json';
import pactAdapterSpec from '@/../../artifacts/multihop_swap/PactPoolAdapter.arc56.json';

export const CONTRACT_SPECS = {
  multihopRouter: multihopRouterSpec,
  tinymanAdapter: tinymanAdapterSpec,
  pactAdapter: pactAdapterSpec
};
```

---

### Usage Example

```typescript
import { getContracts } from '@/lib/config/contracts';
import { MultihopSwapClient } from '@/lib/contracts/multihop-swap-client';
import algosdk from 'algosdk';

// Get contract configuration
const contracts = getContracts();
console.log('Router App ID:', contracts.multihopRouter.appId);

// Initialize swap client
const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  ''
);
const swapClient = new MultihopSwapClient(algodClient, 'testnet');

// Check deployment
const isDeployed = await swapClient.isDeployed();
console.log('Router deployed:', isDeployed); // true

// Execute a swap
const txnId = await swapClient.executeSwap2Hop({
  inputAsset: 0,               // ALGO
  intermediateAsset: 10458941, // USDC
  outputAsset: 312769,         // USDT
  pool1AppId: 552635992,
  pool2AppId: 792313023,
  amountIn: BigInt(1_000_000),
  minAmountOut: BigInt(900_000),
  userAddress: 'YOUR_ADDRESS'
});
```

---

## Contract Verification

### Verify Deployment

```bash
# Check contract exists
curl "https://testnet-api.algonode.cloud/v2/applications/749360450"

# Check contract address
python -c "import algosdk; print(algosdk.logic.get_application_address(749360450))"
```

### Run Integration Tests

```bash
# Test contract interaction
npx tsx scripts/test-contract-integration.ts

# Test multi-DEX routing
npx tsx scripts/test-multi-dex-routing.ts
```

### Verify on Explorer

- **Testnet:** [AlgoScan Testnet](https://testnet.algoscan.app/)
- **Mainnet:** [AlgoScan Mainnet](https://algoscan.app/)

Search by App ID or address to view:
- Contract details
- Transaction history
- Global state
- Local states

---

## Upgrade & Maintenance

### Upgrade Procedure

Algorand smart contracts are **immutable by default**. To upgrade:

1. **Deploy new version** with updated code
2. **Update frontend** to use new App ID
3. **Migrate funds** from old contract
4. **Archive old contract** reference

### Emergency Controls

**Pause Operations:**
- Contracts don't have built-in pause
- Frontend can disable swaps via config
- Update `enabled: false` in contract config

**Circuit Breakers:**
- Max price impact validation (5%)
- Minimum output validation
- Slippage protection

### Monitoring

**Watch for:**
- Failed transactions
- Unusual gas usage
- Contract balance changes
- Error logs in frontend

**Tools:**
- AlgoScan for on-chain monitoring
- Vercel logs for frontend errors
- Custom monitoring via API

---

## Security Considerations

### Audit Checklist

Before mainnet deployment:

- [ ] Smart contract security audit
- [ ] Test all edge cases on testnet
- [ ] Verify minimum output validation
- [ ] Check for reentrancy vulnerabilities
- [ ] Test with maximum values
- [ ] Verify access controls
- [ ] Test emergency scenarios

### Best Practices

✅ **DO:**
- Audit all contracts before mainnet
- Test thoroughly on testnet
- Use dedicated deployer account
- Verify contract addresses
- Monitor contract activity
- Keep deployment records

❌ **DON'T:**
- Deploy to mainnet without auditing
- Reuse deployer mnemonic
- Store private keys in code
- Skip verification steps
- Deploy without testing

---

## Reference Links

### Documentation
- [Algorand Developer Portal](https://developer.algorand.org/)
- [AlgoPy Documentation](https://algorandfoundation.github.io/puya/)
- [ARC-56 Contract Spec](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0056.md)

### Explorers
- [Testnet AlgoScan](https://testnet.algoscan.app/)
- [Mainnet AlgoScan](https://algoscan.app/)
- [Testnet AlgoExplorer](https://testnet.algoexplorer.io/)

### Tools
- [Testnet Faucet](https://bank.testnet.algorand.network/)
- [AlgoKit](https://github.com/algorandfoundation/algokit-cli)

---

**Last Updated:** November 12, 2025  
**Version:** 1.0.0  
**Network:** Testnet  
**Status:** ✅ All Contracts Deployed & Configured
