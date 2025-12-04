# X Token Smart Contract

The X Token is the official reward token for the 10xSwap DEX ecosystem on Algorand.

## Token Specifications

| Property | Value |
|----------|-------|
| **Name** | X Token |
| **Symbol** | X |
| **Type** | Algorand Standard Asset (ASA) |
| **Decimals** | 6 |
| **Total Supply** | 1,000,000,000 (1 billion) |
| **Network** | Algorand TestNet/MainNet |

## Deployment

### Prerequisites

1. Python 3.8+ with `py-algorand-sdk` installed:
   ```bash
   pip install py-algorand-sdk python-dotenv
   ```

2. Set `DEPLOYER_MNEMONIC` in `.env.local` (root directory)

3. Ensure deployer account has at least 1 ALGO for transaction fees

### Deploy on TestNet

From the project root:

```bash
python Blockchain/projects/10x_Swap/smart_contracts/x_token/deploy_config.py
```

Or using the legacy script:

```bash
npx ts-node scripts/deploy-x-token.ts
```

### Post-Deployment

After deployment, add the following to your `.env.local`:

```bash
NEXT_PUBLIC_X_TOKEN_ASA_ID=<deployed_asa_id>
X_TOKEN_TREASURY_ADDRESS=<deployer_address>
ENABLE_X_TOKEN_DISTRIBUTION=true
```

## Token Configuration

### Treasury Allocation

| Pool | Percentage | Tokens | Purpose |
|------|------------|--------|---------|
| Rewards Pool | 70% | 700,000,000 | User quest rewards |
| Liquidity Mining | 15% | 150,000,000 | LP incentives |
| Development | 10% | 100,000,000 | Platform operations |
| Reserve | 5% | 50,000,000 | Future use |

### Features

- **No Freeze**: Users can always transfer their tokens
- **No Clawback**: Tokens cannot be revoked once distributed
- **Decentralized**: Manager address can be removed after deployment
- **Fast Finality**: ~3 second transaction confirmation
- **Low Fees**: ~0.001 ALGO per transaction

## Integration

### User Opt-In

Before users can receive X tokens, they must opt-in to the ASA:

```typescript
import { useXToken } from '@/hooks/useXToken'

function MyComponent() {
  const { balance, isOptedIn, optIn } = useXToken()
  
  if (!isOptedIn) {
    return <button onClick={optIn}>Opt-in to X Token</button>
  }
  
  return <div>Balance: {balance} X</div>
}
```

### API Endpoints

- `GET /api/xtoken?address=<addr>` - Get balance
- `GET /api/xtoken?info=true` - Get token info
- `POST /api/xtoken` - Build opt-in transaction
- `POST /api/rewards/claim` - Claim rewards (auto-distributes X tokens)

## Artifacts

After deployment, the following artifacts are created:

```
artifacts/x_token/
└── deployment_testnet.json  # Deployment details (ASA ID, addresses, etc.)
```

## View on Explorer

- **TestNet**: https://testnet.algoexplorer.io/asset/750589647
- **MainNet**: (Not yet deployed)

## Security Considerations

1. **Treasury Security**: Keep the `DEPLOYER_MNEMONIC` secure
2. **Rate Limiting**: Token distribution is rate-limited via quest system
3. **Opt-In Required**: Users must explicitly opt-in to receive tokens
4. **Minimum Balance**: Each opt-in requires 0.1 ALGO minimum balance

## Tokenomics

See [TOKEN_ECONOMICS.md](../../../../docs/TOKEN_ECONOMICS.md) for detailed tokenomics, utility, and rewards system documentation.
