# Liquidity Pools Guide

**Complete guide to liquidity pools, pool adapters, and DEX integration in 10xSwap.**

## Table of Contents

1. [Overview](#overview)
2. [Pool Adapter Contracts](#pool-adapter-contracts)
3. [Supported DEXs](#supported-dexs)
4. [Pool Discovery](#pool-discovery)
5. [Pool Data Structure](#pool-data-structure)
6. [API Reference](#api-reference)
7. [UI Pages](#ui-pages)
8. [Development Guide](#development-guide)
9. [Testing](#testing)
10. [Adding New DEX Support](#adding-new-dex-support)

---

## Overview

10xSwap integrates with multiple decentralized exchange (DEX) liquidity pools on Algorand to provide users with the best swap rates. The platform uses a **pool adapter pattern** to abstract DEX-specific implementations and enable seamless multi-DEX aggregation.

### Key Features

- ✅ **Multi-DEX Aggregation** - Automatically selects best pool across Tinyman and Pact
- ✅ **Unified Interface** - Consistent API regardless of underlying DEX
- ✅ **Optimal Routing** - Intelligent path selection for multi-hop swaps
- ✅ **Real-time Data** - Live pool reserves, TVL, and volume metrics
- ✅ **Slippage Protection** - Enforced minimum output validation
- ✅ **Gas Optimization** - Fee pooling for efficient transactions

### Architecture

```
┌─────────────────────────────────────────────────────┐
│               MultihopSwapRouter                    │
│           (Unified routing interface)               │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
    ┌──────────▼─────────┐ ┌─────▼──────────┐
    │ TinymanPoolAdapter │ │ PactPoolAdapter│
    │   (749360541)      │ │  (749341932)   │
    └──────────┬─────────┘ └─────┬──────────┘
               │                  │
    ┌──────────▼─────────┐ ┌─────▼──────────┐
    │ Tinyman V2 Pools   │ │ Pact Finance   │
    │ • 100+ pools       │ │ Pools          │
    │ • 0.30% fee        │ │ • 50+ pools    │
    │ • AMM (x*y=k)      │ │ • 0.25% fee    │
    └────────────────────┘ └────────────────┘
```

---

## Pool Adapter Contracts

### TinymanPoolAdapter

**App ID:** `749360541` (testnet)  
**Address:** `IRIK74M646IKDJV2F3QGMVTKHRGRH4PW7C7EOZV5YUYFNT2DYBFJVDJILM`  
**Status:** ✅ Active

#### Purpose

Enables the MultihopSwapRouter to interact with Tinyman V2 constant product AMM pools.

#### Methods

**`swap_fixed_input(pool_app_id, asset_in, asset_out, amount_in, min_amount_out)`**

Execute a fixed-input swap on a Tinyman V2 pool.

**Parameters:**
- `pool_app_id` (Application) - Tinyman pool application ID
- `asset_in` (Asset) - Input asset to swap from
- `asset_out` (Asset) - Output asset to receive
- `amount_in` (UInt64) - Amount of input asset
- `min_amount_out` (UInt64) - Minimum acceptable output (slippage protection)

**Returns:** `UInt64` - Actual output amount received

**Transaction Flow:**
1. Transfer `asset_in` to pool contract address
2. Call Tinyman's swap method (ABI selector: `0xd71d146d`)
3. Monitor balance change to calculate output
4. Validate output meets `min_amount_out` threshold
5. Return output amount to router

**Key Features:**
- Atomic execution within transaction group
- Balance tracking before/after swap
- Slippage protection enforcement
- Fee pooling for gas optimization
- Support for all ASA-to-ASA and ALGO-to-ASA swaps

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/multihop_swap/tinyman_adapter.py`
- TEAL: `artifacts/multihop_swap/TinymanPoolAdapter.approval.teal`
- ABI: `artifacts/multihop_swap/TinymanPoolAdapter.arc56.json`

---

### PactPoolAdapter

**App ID:** `749341932` (testnet)  
**Address:** `5MF2XA5DFO2JKZCSNRGO64LYADV7ZUSF4VE2ZQFPUKPRGG2ZOLBIUOITQU`  
**Status:** ✅ Active

#### Purpose

Enables the MultihopSwapRouter to interact with Pact Finance constant product AMM pools.

#### Methods

**`swap_fixed_input(pool_app_id, asset_in, asset_out, amount_in, min_amount_out)`**

Execute a fixed-input swap on a Pact Finance pool.

**Parameters:** (Same as TinymanPoolAdapter)

**Returns:** `UInt64` - Actual output amount

**Transaction Flow:**
1. Transfer `asset_in` to pool contract
2. Call Pact's SWAP method (ABI selector: `0xf4b4e0f4`)
3. Track balance delta for output calculation
4. Validate slippage protection
5. Return output to router

**`swap_algo_to_asa(pool_app_id, output_asset, algo_amount, min_amount_out)`**

Special case handler for swapping native ALGO to ASA.

**Parameters:**
- `pool_app_id` (Application) - Pact pool app ID
- `output_asset` (Asset) - ASA to receive
- `algo_amount` (UInt64) - Amount of ALGO to swap
- `min_amount_out` (UInt64) - Minimum ASA output

**Returns:** `UInt64` - ASA output amount

**`swap_asa_to_algo(pool_app_id, input_asset, amount_in, min_algo_out)`**

Swap ASA to native ALGO.

**Parameters:**
- `pool_app_id` (Application) - Pact pool app ID
- `input_asset` (Asset) - ASA to swap from
- `amount_in` (UInt64) - ASA input amount
- `min_algo_out` (UInt64) - Minimum ALGO output

**Returns:** `UInt64` - ALGO output amount

#### Key Differences from Tinyman

| Feature | Tinyman | Pact |
|---------|---------|------|
| **ABI Selector** | `0xd71d146d` | `0xf4b4e0f4` |
| **Fee Tier** | 0.30% | 0.25% |
| **ALGO Handling** | Generic asset transfer | Special ALGO methods |
| **Network Support** | Testnet + Mainnet | Mainnet only |

**Source Files:**
- Contract: `Blockchain/projects/10x_Swap/smart_contracts/multihop_swap/pact_adapter.py`
- TEAL: `artifacts/multihop_swap/PactPoolAdapter.approval.teal`
- ABI: `artifacts/multihop_swap/PactPoolAdapter.arc56.json`

---

## Supported DEXs

### Tinyman V2

**Type:** Constant Product AMM  
**Fee:** 30 bps (0.30%)  
**Networks:** Testnet, Mainnet  
**Pool Count:** 100+ pools  

**Pool Formula:**
```
x * y = k (constant product)
output = (amount_in * reserve_out) / (reserve_in + amount_in) - fee
```

**Features:**
- Decentralized liquidity pools
- Anyone can provide liquidity
- Automated market making
- No KYC required
- Open-source contracts

**Testnet Pools:**
- ALGO/USDC
- ALGO/USDT
- USDC/USDT
- And many more...

**API:** [Tinyman Analytics API](https://docs.tinyman.org/)

---

### Pact Finance

**Type:** Constant Product AMM  
**Fee:** 25 bps (0.25%)  
**Networks:** Mainnet (testnet limited)  
**Pool Count:** 50+ pools  

**Pool Formula:**
```
x * y = k (constant product)
Lower fee tier than Tinyman
```

**Features:**
- Lower fees (0.25% vs 0.30%)
- Optimized for stablecoin swaps
- Concentrated liquidity (some pools)
- Mainnet focus
- Active development

**Mainnet Pools:**
- ALGO/USDC
- ALGO/goBTC
- ALGO/goETH
- Stablecoin pairs

**API:** [Pact SDK](https://docs.pact.fi/)

---

## Pool Discovery

### How Pools Are Discovered

10xSwap uses a multi-source pool discovery mechanism:

```
┌──────────────────────────────────────────────────┐
│           POOL DISCOVERY PROCESS                 │
└──────────────┬───────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │ Fetch from DEX APIs │
    │ • Tinyman Analytics │
    │ • Pact Pool API     │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ Parse & Validate    │
    │ • Check reserves    │
    │ • Verify assets     │
    │ • Filter inactive   │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ Enrich with Data    │
    │ • Calculate price   │
    │ • Add logos/names   │
    │ • Format decimals   │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ Cache (5 minutes)   │
    │ • Testnet cache     │
    │ • Mainnet cache     │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ Return to Frontend  │
    └─────────────────────┘
```

### Pool Selection Algorithm

When a user requests a swap, the aggregator:

1. **Fetch all pools** for the token pair
2. **Get quotes** from each pool
3. **Filter** by price impact (<5%)
4. **Rank** by output amount (highest first)
5. **Select** the best pool
6. **Route** to appropriate adapter

**Example:**

```typescript
// User wants to swap 2 USDC for ALGO
const pools = await fetchPools('testnet');
const usdcAlgoPools = pools.filter(p => 
  (p.asset1.symbol === 'USDC' && p.asset2.symbol === 'ALGO') ||
  (p.asset1.symbol === 'ALGO' && p.asset2.symbol === 'USDC')
);

// Get quotes
const quotes = await Promise.all(
  usdcAlgoPools.map(pool => getQuote(pool, 2_000_000, 'USDC', 'ALGO'))
);

// Select best
const bestQuote = quotes.reduce((best, current) => 
  current.outputAmount > best.outputAmount ? current : best
);

console.log(`Best route: ${bestQuote.dex} - Output: ${bestQuote.outputAmount} ALGO`);
```

---

## Pool Data Structure

### PoolInfo Interface

```typescript
interface PoolInfo {
  poolId: string;           // Pool application ID
  
  // Assets
  asset1: {
    id: number;             // Asset ID (0 for ALGO)
    symbol: string;         // e.g., "ALGO", "USDC"
    name: string;           // e.g., "Algorand"
    decimals: number;       // e.g., 6
    logoUrl?: string;       // Optional logo URL
  };
  
  asset2: {
    id: number;
    symbol: string;
    name: string;
    decimals: number;
    logoUrl?: string;
  };
  
  // Pool State
  reserve1: string;         // BigInt as string
  reserve2: string;         // BigInt as string
  totalLiquidity: string;   // BigInt as string
  
  // Pool Config
  fee: number;              // Fee in basis points (30 = 0.30%)
  dexName: string;          // "tinyman" | "pact"
  poolAddress: string;      // Algorand address
  
  // Market Data (mainnet only)
  tvlUSD?: number;          // Total Value Locked in USD
  volume24hUSD?: number;    // 24h trading volume
  volume1dUSD?: number;     // 1d trading volume
  volume30dUSD?: number;    // 30d trading volume
  poolAPR?: number;         // Pool APR from fees
  rewardAPR?: number;       // Additional rewards APR
  fees24hUSD?: number;      // 24h fees collected
}
```

### Example Pool Data

```json
{
  "poolId": "552635992",
  "asset1": {
    "id": 0,
    "symbol": "ALGO",
    "name": "Algorand",
    "decimals": 6,
    "logoUrl": "https://..."
  },
  "asset2": {
    "id": 10458941,
    "symbol": "USDC",
    "name": "USD Coin",
    "decimals": 6,
    "logoUrl": "https://..."
  },
  "reserve1": "1000000000",
  "reserve2": "500000000",
  "totalLiquidity": "707106781",
  "fee": 30,
  "dexName": "tinyman",
  "poolAddress": "ABC...XYZ",
  "tvlUSD": 1250000,
  "volume24hUSD": 85000,
  "poolAPR": 12.5
}
```

---

## API Reference

### GET /api/pools/all

**Fetch all available pools from supported DEXs**

**Query Parameters:**
- `network` - `testnet` or `mainnet` (default: `testnet`)

**Example Request:**
```bash
curl "https://10xswap.com/api/pools/all?network=testnet"
```

**Response:**
```json
{
  "success": true,
  "pools": [ /* array of PoolInfo */ ],
  "network": "testnet",
  "stats": {
    "total": 150,
    "tinyman": 100,
    "pact": 50
  },
  "cached": false,
  "timestamp": 1699564800000
}
```

**Caching:** 5-minute TTL per network

---

### GET /api/pools/market-data

**Fetch TVL, volume, and APR metrics for pools**

**Query Parameters:**
- `network` - `testnet` or `mainnet` (default: `mainnet`)

**Example Request:**
```bash
curl "https://10xswap.com/api/pools/market-data?network=mainnet"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "552635992": {
      "poolId": "552635992",
      "tvlUSD": 1250000,
      "volume24hUSD": 85000,
      "poolAPR": 12.5,
      "rewardAPR": 0
    }
  },
  "cached": true,
  "timestamp": 1699564800000
}
```

**Note:** Market data is only available on mainnet.

---

### GET /api/pools/transactions

**Fetch recent pool transactions**

**Query Parameters:**
- `poolId` - Pool application ID
- `network` - `testnet` or `mainnet`
- `limit` - Max results (default: 50, max: 100)

**Example Request:**
```bash
curl "https://10xswap.com/api/pools/transactions?poolId=552635992&network=testnet&limit=20"
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "TXN123...",
      "type": "swap",
      "timestamp": 1699564800,
      "sender": "USER_ADDRESS",
      "assetIn": "USDC",
      "assetOut": "ALGO",
      "amountIn": "10.5",
      "amountOut": "5.234"
    }
  ],
  "poolId": "552635992",
  "count": 20
}
```

---

### POST /api/swap/opt-in-pool

**Opt user wallet into pool-required assets**

**Request Body:**
```json
{
  "userAddress": "YOUR_ALGORAND_ADDRESS",
  "assetIds": [10458941, 312769]
}
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    { "txn": "base64_encoded_txn_1" },
    { "txn": "base64_encoded_txn_2" }
  ],
  "message": "Please sign opt-in transactions for USDC, USDT"
}
```

---

## UI Pages

### /pool - Pool Explorer

**Purpose:** Browse and search all available liquidity pools

**Features:**
- Pool listing table with sortable columns
- Network toggle (testnet/mainnet)
- Filter by DEX (Tinyman, Pact)
- Search by token pair
- Charts for TVL, volume, top pools
- Real-time reserve data

**Key Components:**
- `PoolTable` - Sortable pool listing
- `PoolCard` - Individual pool display
- Network toggle
- Sort/filter controls

**Data Flow:**
```
Component Mount → fetch('/api/pools/all?network=testnet')
                → Parse response
                → Render pool table
                → Enable sorting/filtering
```

**Screenshot Features:**
- Total Value Locked chart
- 24h Trading Volume chart
- Top 3 pools by TVL
- Filterable pool table

---

### /pool/create - Create Liquidity Position

**Purpose:** Provide liquidity to a pool

**Steps:**

**Step 1: Select Pair & Fee**
- Choose token 0 (e.g., ALGO)
- Choose token 1 (e.g., USDC)
- Select fee tier (0.05%, 0.30%, 1.00%)

**Step 2: Set Range & Amounts**
- Set price range (min/max)
- Specify deposit amounts
- Preview position details

**Transaction Flow:**
1. User fills form
2. Validate inputs
3. Build transaction group
4. Sign with wallet
5. Submit to blockchain
6. Redirect to pool details

---

### /pool/[id] - Pool Details

**Purpose:** View detailed pool analytics and manage positions

**Features:**
- Pool metadata (token pair, fee, DEX)
- Reserve ratio chart
- Price history graph
- Liquidity depth visualization
- Recent transactions
- Add/remove liquidity controls

**Data Sources:**
- Pool reserves from DEX API
- Market data from analytics APIs
- Transactions from Algorand Indexer

---

## Development Guide

### Fetching Pools in Code

```typescript
import { getAlgodClient } from '@/lib/algorand';
import { TinymanV2Client } from '@/lib/dex/tinyman-client';

async function fetchTinymanPools() {
  const algodClient = getAlgodClient();
  const tinymanClient = new TinymanV2Client(algodClient, 'testnet');
  
  const pools = await tinymanClient.fetchPools();
  
  console.log(`Found ${pools.length} Tinyman pools`);
  pools.forEach(pool => {
    console.log(`${pool.asset1.symbol}/${pool.asset2.symbol} - Pool ID: ${pool.poolId}`);
  });
  
  return pools;
}
```

### Getting a Quote from a Pool

```typescript
import { TinymanV2Client } from '@/lib/dex/tinyman-client';

async function getPoolQuote(
  poolId: number,
  assetInId: number,
  assetOutId: number,
  amountIn: bigint
) {
  const algodClient = getAlgodClient();
  const tinymanClient = new TinymanV2Client(algodClient, 'testnet');
  
  const quote = await tinymanClient.getQuote(
    poolId,
    assetInId,
    assetOutId,
    amountIn
  );
  
  console.log(`Quote: ${quote} output tokens`);
  return quote;
}
```

### Executing a Swap via Pool Adapter

```typescript
import algosdk from 'algosdk';
import { getContracts } from '@/lib/config/contracts';

async function executeSwapViaAdapter(
  userAddress: string,
  inputAssetId: number,
  outputAssetId: number,
  poolAppId: number,
  adapterAppId: number,
  amountIn: bigint,
  minAmountOut: bigint
) {
  const algodClient = getAlgodClient();
  const contracts = getContracts();
  const suggestedParams = await algodClient.getTransactionParams().do();
  
  // Transaction 0: Asset transfer to router
  const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: userAddress,
    to: contracts.multihopRouter.address,
    assetIndex: inputAssetId,
    amount: amountIn,
    suggestedParams,
  });
  
  // Transaction 1: Application call to router
  const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
    from: userAddress,
    appIndex: contracts.multihopRouter.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    appArgs: [
      new Uint8Array(Buffer.from('execute_swap_1hop')),
      algosdk.encodeUint64(poolAppId),
      algosdk.encodeUint64(adapterAppId),
      algosdk.encodeUint64(minAmountOut),
    ],
    foreignAssets: [inputAssetId, outputAssetId],
    foreignApps: [poolAppId, adapterAppId],
    suggestedParams,
  });
  
  // Group atomically
  const txnGroup = algosdk.assignGroupID([assetTransferTxn, appCallTxn]);
  
  return txnGroup;
}
```

---

## Testing

### Pool Discovery Test

Create `scripts/test-pool-discovery.ts`:

```typescript
import { getAlgodClient } from '../src/lib/algorand';
import { TinymanV2Client } from '../src/lib/dex/tinyman-client';
import { PactClient } from '../src/lib/dex/pact-client';

async function testPoolDiscovery() {
  const algodClient = getAlgodClient();
  
  console.log('🔍 Testing pool discovery...\n');
  
  // Test Tinyman
  const tinymanClient = new TinymanV2Client(algodClient, 'testnet');
  const tinymanPools = await tinymanClient.fetchPools();
  
  console.log(`✅ Tinyman: ${tinymanPools.length} pools`);
  tinymanPools.slice(0, 3).forEach(pool => {
    console.log(`   ${pool.asset1.symbol}/${pool.asset2.symbol}`);
  });
  
  // Test Pact (mainnet)
  const pactClient = new PactClient(algodClient, 'mainnet');
  const pactPools = await pactClient.fetchPools();
  
  console.log(`\n✅ Pact: ${pactPools.length} pools`);
  pactPools.slice(0, 3).forEach(pool => {
    console.log(`   ${pool.asset1.symbol}/${pool.asset2.symbol}`);
  });
}

testPoolDiscovery().catch(console.error);
```

**Run:**
```bash
npx tsx scripts/test-pool-discovery.ts
```

### Pool Quote Test

Create `scripts/test-pool-quote.ts`:

```typescript
async function testPoolQuote() {
  const algodClient = getAlgodClient();
  const tinymanClient = new TinymanV2Client(algodClient, 'testnet');
  
  const poolId = 552635992; // ALGO/USDC pool
  const amountIn = BigInt(1_000_000); // 1 USDC
  
  const quote = await tinymanClient.getQuote(
    poolId,
    10458941, // USDC
    0,        // ALGO
    amountIn
  );
  
  console.log(`Swapping 1 USDC → ${Number(quote) / 1_000_000} ALGO`);
}

testPoolQuote().catch(console.error);
```

**Run:**
```bash
npx tsx scripts/test-pool-quote.ts
```

### Testing Checklist

- [ ] Fetch pools from Tinyman
- [ ] Fetch pools from Pact (mainnet)
- [ ] Get quote from pool
- [ ] Compare quotes across DEXs
- [ ] Execute swap via adapter
- [ ] Verify transaction on AlgoExplorer
- [ ] Check pool reserves before/after
- [ ] Test slippage protection
- [ ] Test pool UI pages
- [ ] Verify caching behavior

---

## Adding New DEX Support

To integrate a new DEX protocol:

### 1. Create Adapter Smart Contract

Create `Blockchain/projects/10x_Swap/smart_contracts/multihop_swap/new_dex_adapter.py`:

```python
from algopy import (
    ARC4Contract, Asset, Application, UInt64,
    itxn, op, Global, Bytes
)
from algopy.arc4 import abimethod, UInt64 as ARC4UInt64

class NewDexAdapter(ARC4Contract):
    """Adapter for New DEX protocol"""
    
    @abimethod
    def swap_fixed_input(
        self,
        pool_app_id: Application,
        asset_in: Asset,
        asset_out: Asset,
        amount_in: UInt64,
        min_amount_out: UInt64,
    ) -> ARC4UInt64:
        """Execute swap on New DEX pool"""
        
        # Get balance before
        balance_before, _ = op.AssetHoldingGet.asset_balance(
            Global.current_application_address, asset_out
        )
        
        # Transfer input to pool
        itxn.AssetTransfer(
            xfer_asset=asset_in,
            asset_receiver=pool_app_id.address,
            asset_amount=amount_in,
            fee=UInt64(0),
        ).submit()
        
        # Call DEX-specific swap method
        # (Replace with actual DEX ABI)
        swap_method = Bytes.from_hex("12345678")  # DEX method selector
        itxn.ApplicationCall(
            app_id=pool_app_id,
            app_args=(swap_method, op.itob(amount_in), op.itob(min_amount_out)),
            fee=UInt64(0),
        ).submit()
        
        # Get balance after
        balance_after, _ = op.AssetHoldingGet.asset_balance(
            Global.current_application_address, asset_out
        )
        
        output_amount = balance_after - balance_before
        
        # Validate slippage
        assert output_amount >= min_amount_out, "Slippage exceeded"
        
        return ARC4UInt64(output_amount)
```

### 2. Compile Contract

```bash
cd Blockchain/projects/10x_Swap
algokit compile smart_contracts/multihop_swap/new_dex_adapter.py
```

### 3. Deploy Adapter

Create `smart_contracts/multihop_swap/deploy_new_dex_adapter.py`:

```python
from algopy import Application, algod

def deploy_new_dex_adapter():
    algod_client = get_algod_client()
    
    # Deploy contract
    app_id = deploy_contract(
        algod_client,
        approval_teal="artifacts/NewDexAdapter.approval.teal",
        clear_teal="artifacts/NewDexAdapter.clear.teal"
    )
    
    print(f"✅ NewDexAdapter deployed: {app_id}")
    return app_id
```

**Run:**
```bash
python smart_contracts/multihop_swap/deploy_new_dex_adapter.py
```

### 4. Create Client Library

Create `src/lib/dex/new-dex-client.ts`:

```typescript
import algosdk from 'algosdk';
import type { PoolInfo } from './types';

export class NewDexClient {
  constructor(
    private algodClient: algosdk.Algodv2,
    private network: 'testnet' | 'mainnet'
  ) {}
  
  async fetchPools(): Promise<PoolInfo[]> {
    // Fetch pools from DEX API
    const response = await fetch(`https://api.newdex.com/pools?network=${this.network}`);
    const data = await response.json();
    
    // Convert to PoolInfo format
    return data.pools.map(pool => ({
      poolId: pool.id.toString(),
      asset1: { /* ... */ },
      asset2: { /* ... */ },
      reserve1: pool.reserve1,
      reserve2: pool.reserve2,
      fee: pool.fee,
      dexName: 'newdex',
      poolAddress: pool.address,
    }));
  }
  
  async getQuote(
    poolId: number,
    assetIn: number,
    assetOut: number,
    amountIn: bigint
  ): Promise<bigint> {
    // Get quote from pool
    const response = await fetch(`https://api.newdex.com/quote`, {
      method: 'POST',
      body: JSON.stringify({ poolId, assetIn, assetOut, amountIn }),
    });
    
    const data = await response.json();
    return BigInt(data.outputAmount);
  }
}
```

### 5. Update Aggregator

Update `src/lib/dex/aggregator.ts`:

```typescript
import { NewDexClient } from './new-dex-client';

export class MultiDexAggregator {
  private newDexClient: NewDexClient;
  
  constructor(algodClient: algosdk.Algodv2, network: 'testnet' | 'mainnet') {
    this.newDexClient = new NewDexClient(algodClient, network);
  }
  
  async fetchAllPools() {
    const [tinymanPools, pactPools, newDexPools] = await Promise.all([
      this.tinymanClient.fetchPools(),
      this.pactClient.fetchPools(),
      this.newDexClient.fetchPools(), // Add new DEX
    ]);
    
    return [...tinymanPools, ...pactPools, ...newDexPools];
  }
}
```

### 6. Update Configuration

Update `src/lib/config/contracts.ts`:

```typescript
export function getContracts() {
  return {
    adapters: {
      tinyman: { appId: 749360541, enabled: true },
      pact: { appId: 749341932, enabled: true },
      newDex: { appId: YOUR_NEW_ADAPTER_APP_ID, enabled: true },
    }
  };
}
```

### 7. Test Integration

```bash
npx tsx scripts/test-new-dex-integration.ts
```

---

## Best Practices

### Pool Selection

- ✅ Always compare quotes across all available DEXs
- ✅ Consider price impact in selection algorithm
- ✅ Validate pool has sufficient liquidity
- ✅ Check pool status (active vs paused)

### Slippage Protection

- ✅ Always enforce `min_amount_out` threshold
- ✅ Default slippage: 0.5% - 2.0%
- ✅ Allow users to configure slippage tolerance
- ✅ Warn users of high price impact (>3%)

### Gas Optimization

- ✅ Use fee pooling for atomic transaction groups
- ✅ Batch asset opt-ins when possible
- ✅ Cache pool data to reduce API calls
- ✅ Minimize inner transactions in adapters

### Error Handling

- ✅ Handle pool not found errors gracefully
- ✅ Catch and log API failures
- ✅ Provide fallback quotes if primary fails
- ✅ Display user-friendly error messages

---

## Troubleshooting

### "Pool not found" Error

**Cause:** Pool ID invalid or pool doesn't exist on network

**Solution:**
- Verify pool ID is correct
- Check you're on the right network (testnet vs mainnet)
- Confirm pool is active (not deleted)

### "Insufficient liquidity" Error

**Cause:** Pool doesn't have enough reserves for swap

**Solution:**
- Try a smaller swap amount
- Use a different pool
- Wait for liquidity providers to add more

### "Slippage exceeded" Error

**Cause:** Output amount fell below minimum threshold

**Solution:**
- Increase slippage tolerance
- Reduce swap amount
- Wait for better market conditions

### "Asset opt-in required" Error

**Cause:** Wallet hasn't opted into required assets

**Solution:**
```typescript
// Use opt-in endpoint
const response = await fetch('/api/swap/opt-in-pool', {
  method: 'POST',
  body: JSON.stringify({
    userAddress: walletAddress,
    assetIds: [10458941, 312769]
  })
});

const { transactions } = await response.json();
// Sign and submit transactions
```

---

## Related Documentation

- **[CONTRACTS_AND_DEPLOYMENT.md](./CONTRACTS_AND_DEPLOYMENT.md)** - Smart contract deployment
- **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** - Architecture overview
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Development setup
- **[BACKEND_AND_AGENT_SPEC.md](./BACKEND_AND_AGENT_SPEC.md)** - API specifications

---

**Last Updated:** November 28, 2025  
**Version:** 1.1.0  
**Status:** ✅ Active  
**Network:** Testnet + Mainnet
