# AutoPilot Swap Implementation

## Overview
Implemented real swap functionality in the AutoPilot Rule smart contract to execute actual token swaps when rules are triggered, replacing the previous placeholder implementation.

## Implementation Details

### Smart Contract Changes

#### File: `contract.py`

**1. Added Real Swap Execution**
- Implemented `_execute_swap_inner()` method that calls DEX adapters (Tinyman/Pact)
- Uses inner transactions to execute swaps via `TinymanPoolAdapter` or `PactPoolAdapter`
- Handles both ALGO (payment) and ASA (asset transfer) swaps
- Verifies minimum output for slippage protection
- Transfers swapped assets back to contract

**2. Updated `execute_rule()` Method**
- Now requires atomic group of 2 transactions:
  - [0] Payment/AssetTransfer from user to contract
  - [1] Application call to execute_rule
- Validates payment matches expected amount
- Calls `_execute_swap_inner()` with adapter and pool references
- Updates rule statistics after successful swap

**3. Added Asset Opt-In**
- New `opt_in_asset()` admin method for contract to opt into ASAs
- Required before contract can receive and hold tokens
- Uses inner transaction to send 0 asset amount to itself

**4. Added Import**
- Added `TransactionType` to imports for transaction type validation

### Frontend Changes

#### File: `src/lib/contracts/autopilot-client.ts`

**1. Updated `executeRule()` Method**
- Changed to use Tinyman adapter (AppID 749360541) instead of MultihopSwapRouter
- Creates atomic transaction group:
  - Payment transaction (for ALGO) or AssetTransfer (for ASAs)
  - Application call to execute_rule
- Groups transactions with `assignGroupID()`
- Signs both transactions together
- Sends as atomic group

**2. Contract Reference Update**
- Uses `contracts.adapters.tinyman.appId` instead of `contracts.multihopRouter.appId`

#### File: `src/lib/config/contracts.ts`

**Updated Contract Configuration**
- New AutoPilot contract: AppID **749507782**
- Address: `ZM7PG4H5JERPD3WOSLQKAPO2LNU3BLLV5XSUZY3NDDHUJB22XSNV65XW6E`

## Deployment Information

### New Contract Deployment
```
App ID: 749507782
Address: ZM7PG4H5JERPD3WOSLQKAPO2LNU3BLLV5XSUZY3NDDHUJB22XSNV65XW6E
Transaction: LUVPNNC73GOFP6B67A7L5M436GNSELQJXEF22CHRBLPR2B3SWYCQ
Network: Testnet
```

### Setup Required

**1. Fund the Contract**
```bash
cd Blockchain/projects/10x_Swap/smart_contracts/autopilot_rule
python3 fund_and_opt_in.py
```

This script will:
- Fund contract with 5 ALGO (for MBR and operations)
- Opt contract into USDC (10458941)
- Opt contract into USDT (67396430)
- Opt contract into ALGF (70283957)

**2. Verify Assets Opted In**
Check contract holdings at:
https://testnet.explorer.perawallet.app/address/ZM7PG4H5JERPD3WOSLQKAPO2LNU3BLLV5XSUZY3NDDHUJB22XSNV65XW6E/

## How It Works

### Execution Flow

1. **User Triggers Execute**
   - Clicks "Execute" button on AutoPilot rule
   - Enters amount and selects target asset
   - Wallet prompts for 2 transactions (payment + app call)

2. **Payment Transaction**
   ```typescript
   // For ALGO swaps
   makePaymentTxn(user → contract, amount)
   
   // For ASA swaps
   makeAssetTransferTxn(user → contract, assetId, amount)
   ```

3. **App Call Transaction**
   ```typescript
   makeApplicationNoOpTxn(
     appArgs: [
       'execute_rule',
       ruleId,
       owner,
       assetIn,
       assetOut,
       amountIn,
       minAmountOut
     ],
     foreignAssets: [assetIn, assetOut],
     foreignApps: [tinymanAdapter, poolApp]
   )
   ```

4. **Contract Execution**
   ```python
   # Verify atomic group
   assert group_size == 2
   assert payment matches amount_in
   
   # Execute swap via adapter
   - Send asset_in to TinymanPoolAdapter
   - Call swap_fixed_input(pool, asset_in, asset_out, amount, min_out)
   - Receive swapped assets back
   - Verify minimum output met
   
   # Update rule stats
   - total_executions += 1
   - total_spent += amount_in
   - last_execution_timestamp = now
   ```

5. **DEX Adapter Swap**
   ```python
   # TinymanPoolAdapter.swap_fixed_input()
   - Receives asset_in from AutoPilot contract
   - Calls Tinyman pool swap method
   - Returns swapped assets to AutoPilot contract
   ```

## Testing Steps

### 1. Setup Contract (One-Time)
```bash
# Fund and opt-in to assets
cd Blockchain/projects/10x_Swap/smart_contracts/autopilot_rule
python3 fund_and_opt_in.py
# Enter deployer mnemonic when prompted
```

### 2. Create Test Rule
1. Go to AutoPilot Rules page
2. Click "Create New Rule"
3. Configure rule:
   - Strategy: DCA
   - From: ALGO
   - To: USDC (or USDT/ALGF)
   - Max Spend: 1000000 (1 ALGO)
   - Slippage: 500 (5%)
   - Cooldown: 1 minute
4. Save rule

### 3. Execute Rule
1. Click "Execute" on created rule
2. Enter amount (e.g., 100000 = 0.1 ALGO)
3. Wallet will prompt for 2 transactions:
   - Payment: Send ALGO to contract
   - App Call: Execute rule
4. Approve both transactions
5. Wait for confirmation
6. Check rule stats updated

### 4. Verify Swap
Check transactions on AlgoExplorer:
```
https://testnet.explorer.perawallet.app/tx/[TX_ID]
```

Look for:
- Inner transactions from contract to adapter
- Adapter calling Tinyman pool
- Assets transferred back to contract

## Key Points

### Security
- ✅ Atomic transactions prevent partial execution
- ✅ Slippage protection via min_amount_out
- ✅ Spend limits enforced
- ✅ Cooldown periods prevent spam
- ✅ Only rule owner can execute

### DEX Integration
- Uses TinymanPoolAdapter for Tinyman V2 swaps
- Can support PactPoolAdapter for Pact Finance
- Adapter pattern allows adding more DEXs

### Asset Management
- Contract holds swapped assets (DCA accumulation)
- Future: Add withdraw method for users
- Future: Add rebalance logic for REBALANCE rules

## Next Steps

1. **Immediate**
   - Run `fund_and_opt_in.py` to setup new contract
   - Test execute flow with real wallet
   - Verify swaps working on testnet

2. **Short Term**
   - Add user withdraw method
   - Implement REBALANCE strategy logic
   - Add execute history tracking

3. **Future**
   - Multi-asset DCA support
   - Scheduled execution (cron/keeper)
   - Analytics dashboard
   - Mainnet deployment

## Contract Methods

### User Methods
- `create_rule()` - Create new AutoPilot rule
- `execute_rule()` - Execute swap for rule
- `update_rule_status()` - Pause/resume rule
- `delete_rule()` - Delete rule
- `get_rule()` - Get rule details
- `get_rule_stats()` - Get execution statistics

### Admin Methods
- `opt_in_asset()` - Opt contract into ASA
- `set_protocol_fee()` - Update protocol fee
- `set_pause()` - Emergency pause

## Troubleshooting

### "Invalid group size"
- Make sure payment and app call are grouped together
- Check both transactions signed

### "Output below minimum"
- Increase slippage tolerance
- Check pool has sufficient liquidity

### "Asset not opted in"
- Run `fund_and_opt_in.py` to opt contract into assets
- Verify asset holdings on explorer

### "Insufficient balance"
- Ensure contract funded with enough ALGO for MBR
- Each asset opt-in requires 0.1 ALGO minimum balance

## Files Modified

```
Blockchain/projects/10x_Swap/smart_contracts/autopilot_rule/
├── contract.py                    # ✏️ Added swap implementation
├── fund_and_opt_in.py            # ➕ New setup script
└── deployed_autopilot.json        # 📝 Updated App ID

src/lib/contracts/
└── autopilot-client.ts            # ✏️ Added atomic tx group

src/lib/config/
└── contracts.ts                   # 📝 Updated App ID
```

## References

- **AutoPilot Contract**: 749507782
- **Tinyman Adapter**: 749360541
- **Testnet USDC**: 10458941
- **Testnet USDT**: 67396430
- **Testnet ALGF**: 70283957

---

**Status**: ✅ Implementation Complete - Requires Setup
**Network**: Algorand Testnet
**Last Updated**: 2024
