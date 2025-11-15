# Liquidity Pool Creation - Implementation Guide

## Overview

This guide explains how to deploy and use the custom liquidity pool smart contract for creating decentralized liquidity pools on Algorand.

## 📁 What Was Created

### 1. Smart Contract (Python/AlgoKit)
- **Location**: `Blockchain/projects/10x_Swap/smart_contracts/liquidity_pool/contract.py`
- **Features**:
  - Constant product AMM (x * y = k) formula
  - Pool creation with two assets
  - Add/Remove liquidity
  - Token swaps with configurable fees
  - LP token management
  - Fee collection

### 2. Deployment Configuration
- **Location**: `Blockchain/projects/10x_Swap/smart_contracts/liquidity_pool/deploy_config.py`
- Handles contract deployment to testnet/mainnet
- Automatically funds the pool contract
- Saves deployed App ID for reference

### 3. TypeScript Client
- **Location**: `src/lib/contracts/liquidity-pool-client.ts`
- Provides methods to interact with the deployed contract
- Handles transaction building and signing

### 4. API Routes
- **Prepare**: `src/app/api/pool/create/prepare/route.ts`
  - Builds unsigned transactions for pool creation
  - Validates inputs and user balances
  - Returns transactions ready for signing

- **Submit**: `src/app/api/pool/create/submit/route.ts`
  - Submits signed transactions to blockchain
  - Waits for confirmation
  - Stores pool creation in database

### 5. UI Integration
- **Location**: `src/app/pool/create/page.tsx`
- 2-step wizard for pool creation
- Token selection from tradeable assets
- Fee tier configuration
- Amount inputs with validation
- Wallet integration for signing

### 6. Type Definitions
- **Location**: `src/lib/dex/types.ts`
- Added `CreatePoolParams`, `CreatePoolResult`, `LiquidityPosition` interfaces

## 🚀 Deployment Steps

### Step 1: Compile the Smart Contract

```bash
cd Blockchain/projects/10x_Swap/smart_contracts
./compile_all.sh
```

This will compile the liquidity pool contract and output artifacts to `artifacts/liquidity_pool/`.

### Step 2: Set Up Environment Variables

Create a `.env` file (or update existing) with your deployer mnemonic:

```bash
# Copy example file
cp .env.example .env

# Edit .env and add your deployer mnemonic
DEPLOYER_MNEMONIC="your 25-word mnemonic phrase here"
ALGORAND_NETWORK=testnet
```

**Important**: Get testnet ALGO from https://bank.testnet.algorand.network/

### Step 3: Deploy the Contract

```bash
cd Blockchain/projects/10x_Swap
python smart_contracts/liquidity_pool/deploy_config.py
```

This will:
1. Deploy the contract to testnet
2. Fund it with 5 ALGO for operations
3. Save the App ID to `smart_contracts/liquidity_pool/deployed_app_id.txt`
4. Print the App ID and App Address

### Step 4: Update Environment Variables

Add the deployed App ID and Address to your `.env`:

```bash
NEXT_PUBLIC_POOL_APP_ID=<your_app_id_here>
NEXT_PUBLIC_POOL_APP_ADDRESS=<your_app_address_here>
POOL_APP_ID=<your_app_id_here>
POOL_APP_ADDRESS=<your_app_address_here>
```

### Step 5: Restart the Development Server

```bash
npm run dev
```

## 🎯 How to Use

### Creating a Pool (UI)

1. **Navigate to Pool Creation**
   - Go to `/pool/create` in your browser
   - Connect your wallet (Pera, Defly, or Exodus)

2. **Step 1: Select Pair and Fees**
   - Choose Token A (e.g., ALGO)
   - Choose Token B (e.g., USDC)
   - Select fee tier (0.05%, 0.30%, or 1.00%)
   - Click "Continue"

3. **Step 2: Deposit Amounts**
   - Enter amount for Token A
   - Enter amount for Token B
   - (Optional) Set price range
   - Click "Create Position"

4. **Sign Transactions**
   - Approve the transaction group in your wallet
   - Wait for confirmation (~4 seconds)

5. **Success!**
   - You'll receive LP tokens representing your share
   - The pool is now live and tradeable

### Transaction Flow

The pool creation involves multiple atomic transactions:

1. **Create Pool** - Initialize pool with asset IDs and fee
2. **Fund Pool** - Send 0.5 ALGO for minimum balance
3. **Opt-In Asset 1** - Pool opts into first asset
4. **Opt-In Asset 2** - Pool opts into second asset
5. **Create LP Token** - Mint the liquidity provider token
6. **Deposit Asset 1** - Transfer first asset to pool
7. **Deposit Asset 2** - Transfer second asset to pool
8. **Add Liquidity** - Execute add_liquidity method

All transactions are atomic - they either all succeed or all fail.

## 📊 Pool Contract Methods

### `create_pool(asset_1, asset_2, fee_bps)`
Initialize a new liquidity pool
- **Parameters**:
  - `asset_1`: First asset in the pair
  - `asset_2`: Second asset in the pair
  - `fee_bps`: Fee in basis points (30 = 0.3%)
- **Returns**: Success message

### `create_lp_token(total, decimals, name, unit_name)`
Create the LP token for this pool
- **Parameters**:
  - `total`: Total supply of LP tokens
  - `decimals`: Decimal places
  - `name`: LP token name
  - `unit_name`: LP token unit name
- **Returns**: LP token asset ID

### `add_liquidity(asset_1_payment, asset_2_payment, min_lp_tokens)`
Add liquidity to the pool
- **Parameters**:
  - `asset_1_payment`: Payment transaction for asset 1
  - `asset_2_payment`: Payment transaction for asset 2
  - `min_lp_tokens`: Minimum LP tokens to receive (slippage protection)
- **Returns**: Amount of LP tokens minted

### `remove_liquidity(lp_token_payment, min_asset_1, min_asset_2)`
Remove liquidity from the pool
- **Parameters**:
  - `lp_token_payment`: Payment of LP tokens to burn
  - `min_asset_1`: Minimum asset 1 to receive
  - `min_asset_2`: Minimum asset 2 to receive
- **Returns**: Tuple of (asset_1_amount, asset_2_amount)

### `swap(asset_in_payment, asset_out_id, min_amount_out)`
Swap one asset for another
- **Parameters**:
  - `asset_in_payment`: Payment of input asset
  - `asset_out_id`: ID of output asset
  - `min_amount_out`: Minimum output amount (slippage protection)
- **Returns**: Amount of output asset sent

### `get_pool_info()`
Get current pool state (read-only)
- **Returns**: Pool state struct with all pool data

### `get_swap_quote(asset_in_id, asset_out_id, amount_in)`
Get quote for a swap without executing (read-only)
- **Parameters**:
  - `asset_in_id`: Input asset ID
  - `asset_out_id`: Output asset ID
  - `amount_in`: Amount of input asset
- **Returns**: Expected output amount

## 🔧 Architecture

### Constant Product Formula

The pool uses the AMM formula: **x * y = k**

Where:
- `x` = reserve of asset 1
- `y` = reserve of asset 2
- `k` = constant product

For swaps:
```
output = (input * (1 - fee) * reserve_out) / (reserve_in + input * (1 - fee))
```

For liquidity:
```
Initial: LP_tokens = sqrt(amount1 * amount2)
Later: LP_tokens = min(amount1/reserve1, amount2/reserve2) * total_supply
```

### Security Features

1. **Slippage Protection**: All user-facing methods require minimum output amounts
2. **Atomic Transactions**: Multi-step operations use atomic transaction groups
3. **Input Validation**: All inputs are validated before execution
4. **Minimum Liquidity**: Locks 1000 units to prevent division by zero
5. **Fee Limits**: Maximum fee capped at 10%

## 📝 Testing

### Manual Testing Steps

1. **Deploy to Testnet**
   ```bash
   python smart_contracts/liquidity_pool/deploy_config.py
   ```

2. **Create a Test Pool**
   - Use small amounts (e.g., 1 ALGO, 1 USDC)
   - Verify LP tokens received
   - Check pool shows up in `/pool` page

3. **Test Swaps** (when swap UI is integrated)
   - Swap small amount
   - Verify output matches quote
   - Check reserves updated

4. **Test Remove Liquidity** (when remove liquidity UI is added)
   - Remove portion of liquidity
   - Verify assets returned
   - Check LP tokens burned

## 🐛 Troubleshooting

### Common Issues

1. **"Liquidity pool contract not deployed"**
   - Run deployment script
   - Update environment variables
   - Restart dev server

2. **"Insufficient balance"**
   - Get testnet ALGO from dispenser
   - Ensure you're opted into required assets
   - Check you have enough for transaction fees

3. **"Pool already exists"**
   - This contract instance can only have one pool
   - Deploy a new instance for different pairs
   - Or use the existing pool

4. **Transaction fails**
   - Check wallet has enough ALGO for fees
   - Verify assets are opted in
   - Check amounts are positive

## 🔄 Next Steps

### Features to Add

1. **Swap Integration**
   - Update swap UI to use custom pools
   - Add pool selection logic
   - Integrate with routing

2. **Remove Liquidity UI**
   - Create `/pool/remove` page
   - Show user's LP token balance
   - Calculate assets to receive

3. **Pool Analytics**
   - Track volume and fees
   - Display APR/APY
   - Show historical data

4. **Multiple Pools**
   - Deploy pool factory contract
   - Create pools on-demand
   - Index all created pools

5. **Advanced Features**
   - Concentrated liquidity (Uniswap V3 style)
   - Range orders
   - Time-weighted average price (TWAP)

## 📚 References

- [Algorand Smart Contracts](https://developer.algorand.org/docs/get-started/dapps/smart-contracts/)
- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [Uniswap V2 Whitepaper](https://uniswap.org/whitepaper.pdf)
- [Constant Product AMM](https://docs.uniswap.org/protocol/V2/concepts/protocol-overview/how-uniswap-works)

## 💡 Tips

1. **Start Small**: Test with small amounts first
2. **Check Balances**: Ensure sufficient ALGO for fees
3. **Monitor Logs**: Check browser console for detailed error messages
4. **Use Testnet**: Always test on testnet before mainnet
5. **Backup Mnemonics**: Keep deployment account mnemonic safe

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Contract deploys successfully
- ✅ Pool creation completes in UI
- ✅ LP tokens appear in wallet
- ✅ Pool shows in `/pool` list
- ✅ Transaction confirmed on blockchain
