> Deprecated: See ./REAL_SWAP_IMPLEMENTATION.md and ./ROUTER_IMPLEMENTATION.md for the implemented design.

# Swap Implementation TODO List

## 🎯 Goal
Implement end-to-end swap functionality that allows users to swap Algorand assets on testnet through multiple DEXs with real-time pricing.

---

## 📋 Phase 1: Asset & Wallet Integration (FOUNDATIONAL)

### ✅ 1.1 Wallet Connection
- [x] TxnLab UseWallet already integrated
- [x] Pera Wallet support exists
- [x] Defly Wallet support exists
- [ ] **Test wallet connection on testnet**
- [ ] **Handle wallet errors gracefully**

### 🔲 1.2 Get Testnet Assets for Testing
**Problem**: Users need testnet assets to actually test swaps

**Solutions**:
- [ ] **Create testnet asset dispenser/faucet page**
  - Use Algorand testnet dispenser: https://bank.testnet.algorand.network/
  - Get ALGO (native currency)
  
- [ ] **Document testnet asset IDs**:
  ```
  ALGO: 0 (native)
  USDC (testnet): 10458941
  USDt (testnet): 67396430
  PLANET (testnet): 27165954
  goBTC (testnet): 386192725
  goETH (testnet): 386195940
  ```

- [ ] **Create "Get Test Assets" button in UI**
  - Link to testnet bank
  - Instructions for users
  - Auto-detect user wallet address

- [ ] **Add asset opt-in functionality**
  - Users must opt-in to ASAs before receiving them
  - Build UI component for opt-in
  - Handle opt-in transactions

### 🔲 1.3 Asset Balance Checking
- [ ] **Fetch user's asset balances**
  - Use Algod API: `algodClient.accountInformation(address)`
  - Display balances in swap UI
  - Update balances after transactions

- [ ] **Handle asset opt-in status**
  - Check if user has opted into output asset
  - Prompt opt-in if needed
  - Group opt-in with swap transaction

---

## 📋 Phase 2: Real-time Price & Quote System (CRITICAL)

### ✅ 2.1 Pool Data (COMPLETED)
- [x] Tinyman V2 client fetching real pools
- [x] Pact client fetching real pools
- [x] Multi-DEX router finding best routes
- [x] API endpoint `/api/router/quote`

### 🔲 2.2 Real-time Token Pricing
**How we get prices**:

**Option A: From DEX Pools (ALREADY IMPLEMENTED) ✅**
```typescript
// Current implementation in router
price = reserve2 / reserve1 // Price of asset1 in terms of asset2

// Example: ALGO/USDC pool
reserves: { ALGO: 1000000, USDC: 15000000 }
price = 15000000 / 1000000 = 15 USDC per ALGO
```

**Option B: External Price APIs (ENHANCEMENT)**
- [ ] **Integrate CoinGecko API for USD prices**
  - Endpoint: `https://api.coingecko.com/api/v3/simple/price`
  - Get ALGO, USDC, etc. prices in USD
  - Cache for 1 minute

- [ ] **Integrate Vestige Price API**
  - Algorand-specific price aggregator
  - More accurate for ASAs

- [ ] **Fallback price calculation**
  - If API fails, use DEX reserves
  - Calculate TWAP (Time-Weighted Average Price) from multiple pools

### 🔲 2.3 Quote Generation Enhancement
- [ ] **Add price impact warnings**
  - Show "High Price Impact" for >5%
  - Suggest lower amounts
  
- [ ] **Add route comparison UI**
  - Show all available routes
  - Let user choose (not just best)
  
- [ ] **Add minimum received calculation**
  - Apply slippage tolerance (0.5%, 1%, 2%)
  - Show: "Minimum Received: X tokens"

### 🔲 2.4 Real-time Updates
- [ ] **Live quote updates every 5 seconds**
  - WebSocket or polling
  - Update reserves from DEX APIs
  
- [ ] **Price change indicators**
  - Show green/red arrows for price changes
  - Alert user if price changed >1%

---

## 📋 Phase 3: Swap Execution Methods

### 🔲 3.1 Choose Swap Implementation Approach

**OPTION A: Direct DEX SDK Integration (RECOMMENDED FOR MVP) ⭐**

**Pros**:
- Faster to implement
- Already tested by DEXs
- No smart contract deployment needed
- Works immediately on testnet

**Cons**:
- Separate transaction for each DEX
- Multi-hop requires multiple user signatures
- Less gas efficient

**Implementation**:
```typescript
// Tinyman V2 SDK
import { TinymanV2Client } from '@tinymanorg/tinyman-js-sdk'

async function executeTinymanSwap(quote: SwapQuote) {
  const tinyman = new TinymanV2Client(algodClient)
  const pool = await tinyman.getPool(assetA, assetB)
  
  const txnGroup = await pool.prepareSwapTransactions({
    amount: quote.amountIn,
    slippage: 0.05,
    assetIn: assetA,
  })
  
  // Sign with user's wallet
  const signedTxns = await wallet.signTxn(txnGroup)
  
  // Submit to network
  const result = await algodClient.sendRawTransaction(signedTxns).do()
  return result.txId
}
```

```typescript
// Pact SDK
import { PactClient } from '@pactfi/pactsdk'

async function executePactSwap(quote: SwapQuote) {
  const pact = new PactClient(algodClient)
  const pool = await pact.fetchPoolById(poolId)
  
  const swapTxns = pool.prepareSwap({
    amount: quote.amountIn,
    slippagePct: 0.5,
    assetIn: assetA,
  })
  
  const signedTxns = await wallet.signTxn(swapTxns)
  return await algodClient.sendRawTransaction(signedTxns).do()
}
```

**OPTION B: Custom Smart Contract Router (ADVANCED)**

**Pros**:
- Atomic multi-hop swaps
- Single user signature
- Better for complex routes (3+ hops)
- More control over execution

**Cons**:
- Need to deploy contract on testnet
- Complex integration with each DEX
- Higher development time
- Need to fund contract with ALGO

**Implementation**:
```typescript
// Use the MultihopSwapRouter contract you already have
async function executeContractSwap(quote: SwapQuote) {
  const appClient = new ApplicationClient({
    app: MultihopSwapRouter,
    sender: userAddress,
    signer: wallet,
  })
  
  // Group transactions:
  // 1. User sends asset to contract
  // 2. Contract executes multi-hop swap
  // 3. Contract sends output to user
  
  const result = await appClient.call({
    method: 'execute_swap_2hop',
    args: {
      input_asset: assetA,
      intermediate_asset: assetB,
      output_asset: assetC,
      pool1_app_id: tinymanPoolId,
      pool2_app_id: pactPoolId,
      min_output: quote.minimumAmountOut,
      receiver: userAddress,
    },
    boxes: [], // Add if needed
  })
  
  return result.txId
}
```

**RECOMMENDATION**: Start with **Option A (SDK Integration)** for MVP, then enhance with **Option B** for multi-hop optimization.

---

## 📋 Phase 4: Swap UI Components

### 🔲 4.1 Swap Form Component
- [ ] **Create SwapForm component** (`src/components/features/trading/SwapForm.tsx`)
  - Input amount field
  - Token selector (from/to)
  - Slippage settings
  - "Get Quote" button
  - Quote display panel
  - "Swap" button

### 🔲 4.2 Token Selector
- [ ] **Build token selector modal**
  - Search/filter tokens
  - Show balances
  - Show token logos (from metadata)
  - Recent tokens list
  - Popular tokens list

### 🔲 4.3 Quote Display
- [ ] **Show quote details**:
  ```
  You Pay: 10 ALGO
  You Receive: ≈ 155.74 USDC
  
  Price: 1 ALGO = 15.574 USDC
  Price Impact: 0.47%
  
  Route: ALGO → USDC (Tinyman)
  Fee: 0.03 ALGO (0.3%)
  
  Minimum Received: 154.96 USDC (0.5% slippage)
  ```

### 🔲 4.4 Transaction Status
- [ ] **Loading states**
  - "Fetching quote..."
  - "Waiting for wallet..."
  - "Confirming transaction..."
  
- [ ] **Success screen**
  - Show transaction ID
  - Link to AlgoExplorer
  - Show actual amounts received
  
- [ ] **Error handling**
  - "Insufficient balance"
  - "Pool has insufficient liquidity"
  - "Transaction failed"
  - "User rejected"

---

## 📋 Phase 5: DEX SDK Integration

### 🔲 5.1 Install Required SDKs
```bash
npm install @tinymanorg/tinyman-js-sdk
npm install @pactfi/pactsdk
npm install algosdk
```

### 🔲 5.2 Tinyman V2 Integration
- [ ] **Create Tinyman swap executor** (`src/lib/dex/tinyman-swap-executor.ts`)
  ```typescript
  class TinymanSwapExecutor {
    async executeSwap(
      quote: SwapQuote,
      wallet: Wallet,
      slippage: number
    ): Promise<SwapResult>
  }
  ```

- [ ] **Handle Tinyman transaction structure**:
  ```
  Group[0]: Payment to pool (if swapping from ALGO)
  OR
  Group[0]: Asset transfer to pool (if swapping ASA)
  
  Group[1]: App call to pool (swap method)
  Group[2]: Asset transfer from pool (receive output)
  ```

### 🔲 5.3 Pact Integration
- [ ] **Create Pact swap executor** (`src/lib/dex/pact-swap-executor.ts`)
  ```typescript
  class PactSwapExecutor {
    async executeSwap(
      quote: SwapQuote,
      wallet: Wallet,
      slippage: number
    ): Promise<SwapResult>
  }
  ```

- [ ] **Handle Pact-specific methods**:
  - Constant product pools (CONST)
  - Stable swap pools (STABLE) - different math
  - Lending pools (LEND) - different structure

### 🔲 5.4 Multi-hop Coordination
- [ ] **Build multi-hop executor**
  - For 2-hop: Execute hop1, then hop2 sequentially
  - Handle intermediate balances
  - Group all transactions atomically (if using contract)
  
- [ ] **Add cross-DEX routing**
  - Example: ALGO → USDC (Tinyman) → PLANET (Pact)
  - Sign multiple transaction groups
  - Handle partial failures

---

## 📋 Phase 6: Transaction Building & Signing

### 🔲 6.1 Transaction Builder
- [ ] **Create universal transaction builder**
  ```typescript
  class SwapTransactionBuilder {
    buildSwapTransaction(
      quote: SwapQuote,
      userAddress: string,
      slippage: number
    ): Transaction[]
  }
  ```

- [ ] **Add transaction grouping**
  - Use `assignGroupID()` from algosdk
  - Ensure atomic execution

### 🔲 6.2 Wallet Signing Integration
- [ ] **Integrate with UseWallet**
  ```typescript
  import { useWallet } from '@txnlab/use-wallet'
  
  const { signTransactions } = useWallet()
  
  const signedTxns = await signTransactions(
    txnGroup.map(txn => txn.toByte())
  )
  ```

- [ ] **Handle signing errors**
  - User rejection
  - Timeout
  - Wallet disconnection

### 🔲 6.3 Transaction Submission
- [ ] **Submit to Algorand network**
  ```typescript
  const { txId } = await algodClient
    .sendRawTransaction(signedTxns)
    .do()
  ```

- [ ] **Wait for confirmation**
  ```typescript
  const confirmedTxn = await algosdk.waitForConfirmation(
    algodClient,
    txId,
    4 // wait for 4 rounds
  )
  ```

- [ ] **Parse results**
  - Extract actual amounts from logs
  - Detect any errors in inner transactions

---

## 📋 Phase 7: Safety & Validation

### 🔲 7.1 Pre-transaction Checks
- [ ] **Validate user balance**
  ```typescript
  const balance = await getAssetBalance(userAddress, assetIn.id)
  if (balance < amountIn) {
    throw new Error('Insufficient balance')
  }
  ```

- [ ] **Check asset opt-in status**
  ```typescript
  const isOptedIn = await checkOptIn(userAddress, assetOut.id)
  if (!isOptedIn) {
    await promptOptIn(assetOut.id)
  }
  ```

- [ ] **Validate pool liquidity**
  ```typescript
  if (quote.priceImpact > 10) {
    showWarning('Very high price impact!')
  }
  ```

### 🔲 7.2 Slippage Protection
- [ ] **Calculate minimum output**
  ```typescript
  minimumOutput = expectedOutput * (1 - slippageTolerance)
  ```

- [ ] **Add to transaction**
  - Tinyman: Pass as `min_amount_out` parameter
  - Pact: Use `slippagePct` parameter

### 🔲 7.3 Error Recovery
- [ ] **Handle transaction failures**
  - Revert state
  - Show helpful error messages
  - Suggest fixes (increase slippage, reduce amount, etc.)

- [ ] **Add retry mechanism**
  - For network errors
  - With exponential backoff

---

## 📋 Phase 8: Testing Strategy

### 🔲 8.1 Unit Tests
- [ ] Test quote calculation
- [ ] Test transaction building
- [ ] Test slippage calculations
- [ ] Test route finding

### 🔲 8.2 Integration Tests
- [ ] Test with testnet Tinyman pools
- [ ] Test with testnet Pact pools
- [ ] Test multi-hop swaps
- [ ] Test error scenarios

### 🔲 8.3 Manual Testing Checklist
- [ ] Get testnet ALGO from dispenser
- [ ] Opt-in to test assets
- [ ] Execute single-hop swap (ALGO → USDC)
- [ ] Execute single-hop swap (USDC → ALGO)
- [ ] Execute 2-hop swap (ALGO → USDC → PLANET)
- [ ] Test with different slippage settings
- [ ] Test insufficient balance error
- [ ] Test high price impact warning
- [ ] Test wallet rejection

---

## 📋 Phase 9: UI/UX Polish

### 🔲 9.1 Swap Page
- [ ] **Create `/trade` or `/swap` page**
- [ ] **Add swap form**
- [ ] **Add recent transactions list**
- [ ] **Add price charts (optional)**

### 🔲 9.2 User Feedback
- [ ] Loading spinners
- [ ] Progress indicators
- [ ] Success animations
- [ ] Error toasts/modals

### 🔲 9.3 Advanced Features
- [ ] Save favorite token pairs
- [ ] Show transaction history
- [ ] Add swap settings (slippage, deadline, etc.)
- [ ] Export transaction history

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Week 1: Foundation
1. ✅ Pool data & routing (DONE)
2. 🔲 Get testnet assets documentation
3. 🔲 Build asset opt-in UI
4. 🔲 Build swap form UI

### Week 2: Core Swap Logic
5. 🔲 Install Tinyman SDK
6. 🔲 Implement Tinyman swap executor
7. 🔲 Build transaction builder
8. 🔲 Integrate wallet signing

### Week 3: Multi-DEX Support
9. 🔲 Install Pact SDK
10. 🔲 Implement Pact swap executor
11. 🔲 Add multi-hop coordination
12. 🔲 Test cross-DEX swaps

### Week 4: Polish & Testing
13. 🔲 Add slippage protection
14. 🔲 Add error handling
15. 🔲 Manual testing on testnet
16. 🔲 UI/UX improvements

---

## 📊 Key Considerations

### Gas/Transaction Fees
- **Minimum transaction fee**: 0.001 ALGO (1000 microAlgos)
- **Grouped transactions**: 0.001 ALGO per transaction
- **App call fees**: May require higher fees (0.002-0.003 ALGO)
- **Asset opt-in**: 0.001 ALGO + increases minimum balance by 0.1 ALGO

### Minimum Balances
- **Account minimum**: 0.1 ALGO
- **Per asset opted-in**: +0.1 ALGO
- **Per app opted-in**: +0.1 ALGO
- Example: Account with 5 assets needs minimum 0.6 ALGO

### Network Considerations
- **Testnet reset**: Testnet occasionally resets, losing all data
- **Rate limits**: Algod API has rate limits (use caching)
- **Block time**: ~3.7 seconds on Algorand
- **Confirmation**: Wait 4 blocks (~15 seconds) for safety

### Smart Contract Limits
- **Max group size**: 16 transactions
- **Max inner transactions**: 256 per transaction
- **Max app calls**: 8 levels deep
- **Max logs**: 1024 bytes per transaction

---

## 🔧 Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        SWAP FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. User Input
   ↓
2. Fetch Quote (Router finds best route from Tinyman + Pact)
   ↓
3. User Reviews & Confirms
   ↓
4. Build Transactions (DEX-specific structure)
   ↓
5. Sign with Wallet (UseWallet integration)
   ↓
6. Submit to Network (Algod)
   ↓
7. Wait for Confirmation (4 blocks)
   ↓
8. Show Result (Success/Error)
```

### Data Flow
```
Frontend UI
    ↓
SwapForm Component
    ↓
SwapRouter (finds best quote)
    ↓
DEX Clients (Tinyman, Pact)
    ↓
Swap Executor (builds transactions)
    ↓
Wallet (signs)
    ↓
Algod (submits)
    ↓
Blockchain (executes)
```

---

## 📝 Next Immediate Steps

**START HERE** 👇

1. **Create testnet asset guide** - Document how users get test tokens
2. **Build asset opt-in component** - Let users opt into ASAs
3. **Install Tinyman SDK** - `npm install @tinymanorg/tinyman-js-sdk`
4. **Create SwapForm component** - Build the UI
5. **Implement simple ALGO→USDC swap** - Prove concept works

**Ready to start?** Pick task #1 and let's build! 🚀
