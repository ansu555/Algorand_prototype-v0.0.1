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

10xSwap uses six main smart contracts deployed on Algorand blockchain:

1. **MultihopSwapRouter** - Main routing contract for swaps
2. **TinymanPoolAdapter** - Adapter for Tinyman V2 DEX
3. **PactPoolAdapter** - Adapter for Pact Finance DEX
4. **AutoPilotRuleContract** - Automated trading rules
5. **LiquidityPoolContract** - Custom liquidity pool creation
6. **TokenLaunchpad** - WaveBreak token launchpad with bonding curves

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
**Adapter contract for interacting with Tinyman V2 liquidity pools**

- **App ID:** `749360541`
- **Address:** `IRIK74M646IKDJV2F3QGMVTKHRGRH4PW7C7EOZV5YUYFNT2DYBFJVDJILM`
- **Network:** Testnet
- **DEX:** Tinyman V2
- **Transaction ID:** `I7BH4U4HHZZIURVDRKO4O3RUNRYPM2KMTELQVPXDSQEWX7DJ6RQA`
- **Deployer:** `YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I`
- **Status:** ✅ Enabled
- **Fee:** 30 bps (0.3%)
- **Explorer:** [View on AlgoScan](https://testnet.algoscan.app/app/749360541)

**Purpose:**
The TinymanPoolAdapter acts as a bridge between the MultihopSwapRouter and Tinyman V2 liquidity pools. It handles the specific ABI and transaction structure required by Tinyman V2, enabling seamless integration with the multi-DEX aggregation system.

**Methods:**
- `swap_fixed_input(pool_app_id, asset_in, asset_out, amount_in, min_amount_out)` - Execute fixed-input swap on Tinyman pool
  - **Parameters:**
    - `pool_app_id`: Tinyman pool application ID
    - `asset_in`: Input asset to swap from
    - `asset_out`: Output asset to receive
    - `amount_in`: Amount of input asset to swap
    - `min_amount_out`: Minimum acceptable output (slippage protection)
  - **Returns:** Actual output amount received
  - **Transaction Structure:**
    1. Transfer input asset to pool address
    2. Call Tinyman's swap method (ABI selector: `0xd71d146d`)
    3. Verify balance change to calculate output amount
    4. Return output amount to router

**Key Features:**
- **Atomic Execution:** All operations within a single atomic group
- **Slippage Protection:** Validates output meets minimum threshold
- **Fee Pooling:** Uses fee pooling for gas optimization
- **Balance Tracking:** Monitors asset balances before/after swap

**Integration with Liquidity Pools:**
- Connects to Tinyman V2 constant product AMM pools
- Supports all ASA-to-ASA swaps and ALGO-to-ASA swaps
- Handles pool state validation and balance verification
- Compatible with Tinyman's pool discovery and routing system

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/multihop_swap/tinyman_adapter.py`
- TEAL: `artifacts/multihop_swap/TinymanPoolAdapter.approval.teal`
- ABI: `artifacts/multihop_swap/TinymanPoolAdapter.arc56.json`

---

#### 3. PactPoolAdapter
**Adapter contract for interacting with Pact Finance liquidity pools**

- **App ID:** `749341932`
- **Address:** `5MF2XA5DFO2JKZCSNRGO64LYADV7ZUSF4VE2ZQFPUKPRGG2ZOLBIUOITQU`
- **Network:** Testnet
- **DEX:** Pact Finance
- **Transaction ID:** `4DOBHUDTL26N5ZWRPYSGZNIP5NBVJIKRSYYVJHHSQ65AG5QAD7LA`
- **Deployer:** `YCBV32KEY47XNQ6SB2GIS3PAFQP2GUQ3Z7JZ2U4A3PSMCRLXQAWMJM657I`
- **Status:** ✅ Enabled
- **Fee:** 25 bps (0.25%)
- **Explorer:** [View on AlgoScan](https://testnet.algoscan.app/app/749341932)

**Purpose:**
The PactPoolAdapter enables interaction with Pact Finance constant product liquidity pools. It implements Pact's specific ABI interface, which differs from Tinyman's structure, allowing the router to seamlessly work with both DEX protocols.

**Methods:**
- `swap_fixed_input(pool_app_id, asset_in, asset_out, amount_in, min_amount_out)` - Execute fixed-input swap on Pact pool
  - **Parameters:**
    - `pool_app_id`: Pact pool application ID
    - `asset_in`: Input asset to swap
    - `asset_out`: Output asset to receive
    - `amount_in`: Input amount
    - `min_amount_out`: Minimum output for slippage protection
  - **Returns:** Actual output amount
  - **Transaction Structure:**
    1. Transfer input asset to pool contract
    2. Call Pact's SWAP method (ABI selector: `0xf4b4e0f4`)
    3. Track balance changes to determine output
    4. Validate against minimum output threshold

- `swap_algo_to_asa(pool_app_id, output_asset, algo_amount, min_amount_out)` - Swap native ALGO to ASA
  - Special case handler for ALGO (asset ID 0) swaps
  - Uses payment transaction instead of asset transfer
  
- `swap_asa_to_algo(pool_app_id, input_asset, amount_in, min_algo_out)` - Swap ASA to native ALGO
  - Handles output as ALGO payment transaction

**Key Features:**
- **Pact Protocol Compatibility:** Implements Pact's unique swap interface
- **Native ALGO Support:** Special handling for ALGO as native currency
- **Balance Verification:** Pre/post-swap balance tracking for accuracy
- **Slippage Protection:** Enforces minimum output requirements
- **Optimized Gas:** Fee pooling enabled for transaction efficiency

**Integration with Liquidity Pools:**
- Connects to Pact Finance constant product AMM pools
- Supports mainnet liquidity pools (testnet Pact pools limited)
- Handles both ASA-ASA and ALGO-ASA pool types
- Compatible with Pact's pool discovery mechanism

**Differences from Tinyman:**
- Uses different ABI method selector (`0xf4b4e0f4` vs `0xd71d146d`)
- Requires separate ALGO swap handlers
- Lower fee tier (0.25% vs 0.30%)
- Different pool state management

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/multihop_swap/pact_adapter.py`
- TEAL: `artifacts/multihop_swap/PactPoolAdapter.approval.teal`
- ABI: `artifacts/multihop_swap/PactPoolAdapter.arc56.json`

---

#### 4. AutoPilotRuleContract
**Smart contract for automated trading rules and conditions**

- **App ID:** `749509231`
- **Address:** `KO5JO5GWYY5TIY3NQJ3VHNKF6DZSVWGWHBJI55LSFPA5PYQXMGSGWIEGS4`
- **Network:** Testnet
- **Transaction ID:** `MBMPEDXMZ5CY6MGZYZL7AAU6V5OKS464F44F5BYNMTOMTBHUJFOA`
- **Funding Transaction:** `XBPW5H26KMFKFDYVQXK44ANQNMKB36DX6PQAIINJYPYVGXRJZAIA`
- **Deployer:** `OA57DAFKUMATT3WK3DPJP7XZEFIXHRN7DAWR72YTOKYECVI3AOP2VYJQIE`
- **Explorer:** [View on Lora](https://lora.algokit.io/testnet/application/749509231)

**Methods:**
- `create_rule()` - Create new trading rule
- `execute_rule()` - Execute rule if conditions met
- `delete_rule()` - Remove trading rule

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/autopilot_rule/contract.py`
- TEAL: `artifacts/autopilot_rule/AutoPilotRuleContract.approval.teal`
- ABI: `artifacts/autopilot_rule/AutoPilotRuleContract.arc56.json`

---

#### 5. LiquidityPoolContract
**Custom liquidity pool contract for creating decentralized AMM pools**

- **Status:** ⚠️ Deploy separately per pool (not shared instance)
- **Network:** Testnet / Mainnet

**Purpose:**
The LiquidityPoolContract enables creation of custom constant product AMM liquidity pools. Each pool deployment is independent.

**Methods:**
- `create_pool(asset_1, asset_2, fee_bps)` - Initialize a new liquidity pool
- `create_lp_token(total, decimals, name, unit_name)` - Create LP token for pool
- `add_liquidity(asset_1_payment, asset_2_payment, min_lp_tokens)` - Add liquidity to pool
- `remove_liquidity(lp_token_payment, min_asset_1, min_asset_2)` - Remove liquidity
- `swap(asset_in_payment, asset_out_id, min_amount_out)` - Execute swap
- `get_pool_info()` - Get current pool state (read-only)
- `get_swap_quote(asset_in_id, asset_out_id, amount_in)` - Get quote without executing

**Key Features:**
- **Constant Product AMM:** Uses x * y = k formula
- **Configurable Fees:** 5-1000 bps (0.05% - 10%)
- **LP Token Management:** Automatic minting/burning
- **Slippage Protection:** All user-facing methods require minimum output

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/liquidity_pool/contract.py`
- TEAL: `artifacts/liquidity_pool/LiquidityPoolContract.approval.teal`
- ABI: `artifacts/liquidity_pool/LiquidityPoolContract.arc56.json`

---

#### 6. TokenLaunchpad
**WaveBreak token launchpad with bonding curve mechanics**

- **App ID:** `750324113`
- **Network:** Testnet
- **Transaction ID:** `IX6LGJQPX4AZUAWVQ33BRAZ5N6EXPZ4O3IICEIEU2YQZ2HOEJWJQ`
- **Confirmed Round:** `57944423`
- **Deployer:** `5IZJEVVOAVXOVCN35JQ5PBDBDAPEBUTKST7GDGUGEBP5QNY7S5YWDYSME4`
- **Explorer:** [View on Lora](https://lora.algokit.io/testnet/application/750324113)

**Purpose:**
The TokenLaunchpad contract enables fair token launches using bonding curves with anti-bot protection. Projects can configure pricing curves (linear, exponential, sigmoid) and automatic graduation to DEX liquidity pools.

**Methods:**
- `create_launch()` - Create new token launch with bonding curve configuration
- `buy_tokens()` - Purchase tokens during bonding curve phase
- `claim_tokens()` - Claim vested tokens after graduation
- `graduate()` - Trigger graduation when funding target is met
- `get_launch_info()` - Get current launch status (read-only)
- `get_price_quote()` - Get price quote for purchase amount

**Key Features:**
- **Bonding Curves:** Linear, Exponential, and Sigmoid price curves
- **Anti-Bot Protection:** Cooldown periods, per-transaction limits, whale penalties
- **Early Buyer Rewards:** 3x → 1x points multiplier based on purchase timing
- **30-Day Vesting:** Linear unlock schedule for fair distribution
- **Auto-DEX Graduation:** Automatic liquidity pool creation when target reached
- **LP Lock:** 6-month liquidity pool locks for project credibility

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/token_launchpad/contract.py`
- TEAL: `artifacts/token_launchpad/TokenLaunchpad.approval.teal`
- ABI: `artifacts/token_launchpad/TokenLaunchpad.arc56.json`

---

## Liquidity Pool Adapter Architecture

### Overview

The liquidity pool adapter system enables 10xSwap to interact with multiple DEX protocols through a unified interface. Each DEX (Tinyman, Pact, etc.) has unique smart contract interfaces and transaction structures, so dedicated adapter contracts abstract these differences.

### Architecture Pattern

```
┌────────────────────────────────────────────────────────────┐
│                   MultihopSwapRouter                       │
│         (Unified swap execution interface)                 │
└──────────────────┬────────────────────┬────────────────────┘
                   │                    │
      ┌────────────▼─────────┐  ┌──────▼────────────┐
      │ TinymanPoolAdapter   │  │ PactPoolAdapter   │
      │                      │  │                   │
      │ • Tinyman V2 ABI    │  │ • Pact ABI        │
      │ • 0.30% fee         │  │ • 0.25% fee       │
      │ • Selector:         │  │ • Selector:       │
      │   0xd71d146d        │  │   0xf4b4e0f4      │
      └──────────┬───────────┘  └─────┬─────────────┘
                 │                    │
         ┌───────▼──────────┐  ┌──────▼─────────────┐
         │  Tinyman V2      │  │  Pact Finance      │
         │  Liquidity Pools │  │  Liquidity Pools   │
         │                  │  │                    │
         │ • ALGO/USDC      │  │ • ALGO/USDC        │
         │ • USDC/USDT      │  │ • ALGO/USDT        │
         │ • 100+ pools     │  │ • 50+ pools        │
         └──────────────────┘  └────────────────────┘
```

### Adapter Benefits

1. **Protocol Abstraction** - Router doesn't need to know DEX-specific details
2. **Extensibility** - New DEX support requires only a new adapter
3. **Optimal Routing** - Can select best pool across all supported DEXs
4. **Unified Interface** - Consistent swap API regardless of underlying DEX
5. **Gas Efficiency** - Single router can delegate to multiple adapters

### Pool Discovery & Selection

The system discovers and ranks pools using this flow:

1. **Pool Fetching** - Fetch all pools from Tinyman and Pact APIs
2. **Quote Comparison** - Get quotes for desired swap from each DEX
3. **Selection Algorithm**:
   - Filter pools with >5% price impact
   - Prefer user's selected DEX (if any)
   - Select pool with highest output amount
   - Tie-breaker: deepest liquidity
4. **Adapter Routing** - Route to appropriate adapter based on DEX selection

### Liquidity Pool Types

#### Constant Product AMM (Tinyman V2, Pact)

Both Tinyman and Pact use constant product (x * y = k) formula:

```
reserve_A * reserve_B = constant_product

output_amount = (amount_in * reserve_out) / (reserve_in + amount_in) - fee
```

**Key Characteristics:**
- Equal weight pools (50/50 ratio)
- Automated market making
- No order book required
- Price determined by reserve ratios
- Liquidity providers earn fees proportionally

#### Pool Parameters

| Parameter | Tinyman V2 | Pact Finance |
|-----------|------------|--------------|
| **Fee Tier** | 30 bps (0.3%) | 25 bps (0.25%) |
| **Pool Type** | Constant Product | Constant Product |
| **Supported Networks** | Testnet, Mainnet | Mainnet only |
| **Min Liquidity** | 1,000 ALGO equiv | 1,000 ALGO equiv |
| **Max Slippage** | 5% default | 5% default |

### Pool State Management

Adapters track pool state through:

1. **Reserve Monitoring** - Query pool reserves before swap
2. **Balance Tracking** - Monitor adapter balance before/after operations
3. **Output Calculation** - Calculate received amount from balance delta
4. **Validation** - Verify output meets minimum threshold

### Transaction Lifecycle

```
┌──────────────────────────────────────────────────────────┐
│ 1. User submits swap request via frontend                │
└──────────────────┬───────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Multi-DEX aggregator fetches quotes                   │
│    - Tinyman: 1.234 ALGO (via TinymanPoolAdapter)       │
│    - Pact: 1.245 ALGO (via PactPoolAdapter)             │
└──────────────────┬───────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Select best pool (Pact: 1.245 ALGO)                  │
└──────────────────┬───────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│ 4. Build atomic transaction group:                       │
│    Txn 0: AssetTransfer (User → Router)                 │
│    Txn 1: ApplicationCall (Router.execute_swap_2hop)    │
│           Args: [pool_id, pact_adapter_id, min_out]     │
└──────────────────┬───────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│ 5. Router delegates to PactPoolAdapter                   │
│    - Router calls adapter.swap_fixed_input()             │
│    - Passes pool_id and swap parameters                  │
└──────────────────┬───────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│ 6. PactPoolAdapter interacts with Pact pool              │
│    - Transfers input asset to pool                       │
│    - Calls pool's SWAP method (0xf4b4e0f4)              │
│    - Receives output asset from pool                     │
│    - Validates slippage threshold                        │
└──────────────────┬───────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│ 7. Adapter returns output to router                      │
└──────────────────┬───────────────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│ 8. Router transfers output to user                       │
│    Final validation: output >= min_output                │
└──────────────────────────────────────────────────────────┘
```

### Pool Data APIs

The platform provides REST APIs for pool discovery and analytics:

#### `/api/pools/all`
**Fetch all available pools from supported DEXs**

```typescript
GET /api/pools/all?network=testnet

Response:
{
  "success": true,
  "pools": [
    {
      "poolId": "12345678",
      "asset1": { "id": 0, "symbol": "ALGO", "decimals": 6 },
      "asset2": { "id": 10458941, "symbol": "USDC", "decimals": 6 },
      "reserve1": "1000000000",
      "reserve2": "500000000",
      "fee": 30,
      "dexName": "tinyman",
      "poolAddress": "ABC...XYZ"
    }
  ],
  "stats": {
    "total": 150,
    "tinyman": 100,
    "pact": 50
  }
}
```

#### `/api/pools/market-data`
**Fetch TVL, volume, and APR metrics**

```typescript
GET /api/pools/market-data?network=mainnet

Response:
{
  "success": true,
  "data": {
    "12345678": {
      "poolId": "12345678",
      "tvlUSD": 1250000,
      "volume24hUSD": 85000,
      "poolAPR": 12.5,
      "rewardAPR": 0,
      "fees24hUSD": 255
    }
  }
}
```

#### `/api/pools/transactions`
**Fetch recent pool transactions**

```typescript
GET /api/pools/transactions?poolId=12345678&network=testnet

Response:
{
  "success": true,
  "transactions": [
    {
      "id": "TXN123...",
      "type": "swap",
      "assetIn": "USDC",
      "assetOut": "ALGO",
      "amountIn": "10.5",
      "amountOut": "5.2",
      "timestamp": 1699564800
    }
  ]
}
```

### UI Integration

The pool system provides UI pages for liquidity management:

#### Pool Explorer (`/pool`)
- Browse all available pools across DEXs
- Filter by DEX, token pair, TVL, volume
- View pool metrics (TVL, APR, volume, reserves)
- Support for testnet and mainnet switching

#### Create Position (`/pool/create`)
- Select token pair and fee tier
- Set price range (for concentrated liquidity)
- Specify deposit amounts
- Preview position details before creation

#### Pool Details (`/pool/[id]`)
- Detailed pool analytics
- Liquidity charts and price history
- Add/remove liquidity interface
- Transaction history for the pool

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
- [Lora AlgoKit (Primary)](https://lora.algokit.io/testnet) - Recommended for smart contract debugging and ABI exploration
- [Allo Explorer](https://testnet.explorer.perawallet.app/) - Alternative explorer by Pera Wallet

### Tools
- [Testnet Faucet](https://bank.testnet.algorand.network/)
- [AlgoKit](https://github.com/algorandfoundation/algokit-cli)

---

**Last Updated:** November 28, 2025  
**Version:** 2.0.0  
**Network:** Testnet  
**Status:** ✅ All Contracts Deployed & Configured (6 contracts)
