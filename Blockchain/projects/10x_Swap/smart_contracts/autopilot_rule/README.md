# AutoPilot Rule Contract

An Algorand smart contract for automated trading strategies with trigger-based execution.

## 🎯 Overview

The AutoPilot Rule Contract enables users to create and execute automated trading rules for:
- **DCA (Dollar Cost Averaging)**: Buy assets on price drops
- **REBALANCE**: Maintain portfolio allocation based on trends
- **ROTATE**: Rotate into top-performing assets

## 🏗️ Architecture

### Contract Features
- ✅ **On-chain rule storage** using box storage (scalable, pay-per-use)
- ✅ **Multiple trigger types**: price drops, trends, momentum
- ✅ **Risk controls**: max spend limits, slippage protection, cooldown periods
- ✅ **Owner-controlled**: Only rule owners can modify/delete their rules
- ✅ **Emergency pause**: Admin can pause all executions
- ✅ **Execution tracking**: Track total executions and spend per rule

### Data Structures

#### RuleData
```python
rule_id: UInt64              # Unique identifier
owner: Address               # Rule creator
rule_type: UInt8             # 1=DCA, 2=REBALANCE, 3=ROTATE
status: UInt8                # 1=active, 2=paused, 3=cancelled
target_assets: [UInt64]      # Asset IDs to trade
max_spend_microalgos: UInt64 # Max spend per execution
max_slippage_bps: UInt16     # Max slippage (basis points)
cooldown_minutes: UInt16     # Cooldown between executions
trigger: TriggerData         # Trigger conditions
last_execution: UInt64       # Last execution timestamp
total_executions: UInt32     # Execution count
total_spent: UInt64          # Total ALGO spent
```

#### TriggerData
```python
trigger_type: UInt8          # 1=price_drop, 2=trend, 3=momentum
threshold_bps: UInt16        # Threshold (basis points, 500 = 5%)
window_hours: UInt16         # Time window for trend triggers
lookback_days: UInt8         # Lookback period for momentum
```

## 📝 Contract Methods

### 1. Create Rule
```python
create_rule(
    rule_type: UInt8,
    target_assets: [UInt64],
    rotate_top_n: UInt8,
    max_spend_microalgos: UInt64,
    max_slippage_bps: UInt16,
    cooldown_minutes: UInt16,
    trigger_type: UInt8,
    threshold_bps: UInt16,
    window_hours: UInt16,
    payment: PaymentTransaction,
) -> UInt64
```

**Example:**
```typescript
// Create DCA rule: Buy USDC when price drops 5%
await appClient.call({
  method: "create_rule",
  args: {
    rule_type: 1,  // DCA
    target_assets: [10458941],  // USDC testnet
    rotate_top_n: 0,
    max_spend_microalgos: 1_000_000,  // 1 ALGO max
    max_slippage_bps: 50,  // 0.5%
    cooldown_minutes: 60,  // 1 hour
    trigger_type: 1,  // price_drop
    threshold_bps: 500,  // 5%
    window_hours: 0,
    payment: paymentTxn,  // ~0.165 ALGO for box storage
  }
});
```

### 2. Execute Rule
```python
execute_rule(
    rule_id: UInt64,
    owner: Address,
    asset_in: Asset,
    asset_out: Asset,
    amount_in: UInt64,
    min_amount_out: UInt64,
    swap_router_app: Application,
    pool_app: Application,
) -> UInt64
```

**Validations:**
- ✅ Rule must be active
- ✅ Cooldown period must have passed
- ✅ Amount must not exceed max_spend
- ✅ Caller must be owner or contract

### 3. Update Rule Status
```python
update_rule_status(
    rule_id: UInt64,
    new_status: UInt8,  # 1=active, 2=paused, 3=cancelled
) -> None
```

**States:**
- `1 (ACTIVE)`: Rule can execute
- `2 (PAUSED)`: Temporarily disabled
- `3 (CANCELLED)`: Permanently disabled

### 4. Update Rule Parameters
```python
update_rule_parameters(
    rule_id: UInt64,
    max_spend_microalgos: UInt64,
    max_slippage_bps: UInt16,
    cooldown_minutes: UInt16,
) -> None
```

### 5. Delete Rule
```python
delete_rule(rule_id: UInt64) -> None
```
Deletes rule and returns box storage MBR to owner.

### 6. Get Rule (Read-only)
```python
get_rule(rule_id: UInt64, owner: Address) -> RuleData
```

### 7. Get Rule Stats (Read-only)
```python
get_rule_stats(rule_id: UInt64, owner: Address) -> (UInt32, UInt64, UInt64)
```
Returns: `(total_executions, total_spent, last_execution_timestamp)`

## 💰 Economics

### Box Storage Costs
Each rule requires box storage:
- **Minimum balance**: 2,500 microALGOs
- **Per-byte cost**: 400 microALGOs/byte
- **Estimated rule size**: ~400 bytes
- **Total cost**: ~165,000 microALGOs (0.165 ALGO)

Payment required when creating rule (refunded on deletion).

### Protocol Fee (Optional)
- Default: 0.1% (10 basis points)
- Max: 1% (100 basis points)
- Collected on each execution

## 🔒 Security

### Access Control
- **Rule owner**: Can pause, update parameters, delete
- **Contract admin**: Can set protocol fee, emergency pause
- **Executors**: Can trigger execution (with validations)

### Risk Controls
1. **Max spend limit**: Prevents excessive capital deployment
2. **Slippage protection**: Max 50% slippage allowed
3. **Cooldown period**: Min 5 minutes between executions
4. **Status checks**: Only active rules can execute
5. **Owner verification**: Only owner can modify rules

### Emergency Controls
- Admin can pause all contract operations
- Individual rules can be paused by owners
- Rules can be cancelled (permanent)

## 🚀 Deployment

### Prerequisites
```bash
# Install AlgoKit
brew install algorandfoundation/algokit/algokit

# OR
pipx install algokit

# Verify
algokit --version
```

### Compile Contract
```bash
cd Blockchain/10x_Swap/projects/10x_Swap
algokit project run build
```

Artifacts generated in:
```
smart_contracts/autopilot_rule/smart_contracts/artifacts/
├── AutoPilotRuleContract.approval.teal
├── AutoPilotRuleContract.clear.teal
└── AutoPilotRuleContract.arc56.json
```

### Deploy to Testnet
```bash
# Set environment variables
export ALGOD_SERVER="https://testnet-api.algonode.cloud"
export ALGOD_TOKEN="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
export DEPLOYER_MNEMONIC="your 25-word mnemonic here"

# Deploy
python smart_contracts/autopilot_rule/deploy_config.py
```

### Verify Deployment
```bash
# Check application on AlgoExplorer
# https://testnet.explorer.perawallet.app/application/{APP_ID}
```

## 📊 Integration Example

### TypeScript Integration
```typescript
import algosdk from 'algosdk';
import { ApplicationClient } from '@algorandfoundation/algokit-utils';

// Load contract ABI
const appSpec = require('./artifacts/AutoPilotRuleContract.arc56.json');

// Connect to Algorand
const algodClient = new algosdk.Algodv2(
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'https://testnet-api.algonode.cloud',
  ''
);

// Create application client
const appClient = new ApplicationClient(
  {
    app: appSpec,
    sender: { addr: userAddress, signer: walletSigner },
    resolveBy: 'id',
    id: APP_ID,
  },
  algodClient
);

// Create a DCA rule
const suggestedParams = await algodClient.getTransactionParams().do();

// Payment for box storage
const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
  from: userAddress,
  to: algosdk.getApplicationAddress(APP_ID),
  amount: 165000, // 0.165 ALGO
  suggestedParams,
});

const result = await appClient.call({
  method: 'create_rule',
  args: {
    rule_type: 1,  // DCA
    target_assets: [10458941],  // USDC
    rotate_top_n: 0,
    max_spend_microalgos: 1_000_000,
    max_slippage_bps: 50,
    cooldown_minutes: 60,
    trigger_type: 1,
    threshold_bps: 500,
    window_hours: 0,
    payment: paymentTxn,
  },
  sendParams: { fee: algosdk.algosToMicroalgos(0.002) },
});

const ruleId = result.return?.valueOf();
console.log(`Rule created: ${ruleId}`);
```

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
algokit project run test

# Run specific test
pytest tests/test_autopilot_rule.py -v
```

### Test Scenarios
1. ✅ Create DCA rule
2. ✅ Create REBALANCE rule
3. ✅ Create ROTATE rule
4. ✅ Execute rule with cooldown check
5. ✅ Pause and resume rule
6. ✅ Update rule parameters
7. ✅ Delete rule and reclaim MBR
8. ✅ Prevent unauthorized access
9. ✅ Enforce spend limits
10. ✅ Emergency pause functionality

## 📚 Use Cases

### 1. DCA Strategy
```python
# Buy USDC every time it drops 3%
rule_type = 1  # DCA
trigger_type = 1  # price_drop
threshold_bps = 300  # 3%
cooldown_minutes = 120  # 2 hours
max_spend = 5_000_000  # 5 ALGO
```

### 2. Rebalance Strategy
```python
# Rebalance when trend changes by 5% over 7 days
rule_type = 2  # REBALANCE
trigger_type = 2  # trend
threshold_bps = 500  # 5%
window_hours = 168  # 7 days
cooldown_minutes = 1440  # 24 hours
```

### 3. Rotate Strategy
```python
# Rotate into top 3 assets on momentum
rule_type = 3  # ROTATE
trigger_type = 3  # momentum
rotate_top_n = 3
threshold_bps = 1000  # 10%
cooldown_minutes = 360  # 6 hours
```

## 🔧 Frontend Integration

### API Endpoint (Next.js)
```typescript
// /api/autopilot/create-rule/route.ts
export async function POST(request: NextRequest) {
  const { ruleType, targetAssets, maxSpend, slippage, cooldown, trigger } = await request.json();
  
  // Create rule on-chain
  const result = await appClient.call({
    method: 'create_rule',
    args: { /* ... */ },
  });
  
  return NextResponse.json({ ruleId: result.return?.valueOf() });
}
```

## 📖 Additional Resources

- [Algorand Box Storage](https://developer.algorand.org/docs/get-details/dapps/smart-contracts/apps/state/#box-storage)
- [ARC-4 ABI Encoding](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0004.md)
- [AlgoKit Documentation](https://developer.algorand.org/docs/get-started/algokit/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- GitHub Issues: [Report bugs](https://github.com/your-repo/issues)
- Discord: [Join community](#)
- Documentation: [Full docs](#)

---

**Built with ❤️ for the Algorand ecosystem**
