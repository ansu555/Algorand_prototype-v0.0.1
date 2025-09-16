# Algorand Wallet Integration

This project includes comprehensive Algorand wallet integration using the TxnLab use-wallet library, supporting multiple wallet providers and seamless transaction signing.

## 🚀 Features

- **Multiple Wallet Support**: Pera, Defly, Exodus, Lute, Daffi, and WalletConnect
- **Account Management**: Switch between multiple accounts
- **Transaction Signing**: Sign and send Algorand transactions
- **Mobile & Desktop**: Support for both mobile and desktop wallets
- **Network Switching**: Testnet and Mainnet support
- **Modern UI**: Beautiful, responsive wallet connection components

## 📦 Dependencies

The following packages are already installed and configured:

```json
{
  "@txnlab/use-wallet": "^4.3.1",
  "@txnlab/use-wallet-react": "^4.3.1",
  "@perawallet/connect": "^1.3.4",
  "@blockshake/defly-connect": "^1.0.0",
  "@randlabs/myalgo-connect": "^1.4.2",
  "lute-connect": "^1.6.2",
  "@daffiwallet/connect": "^1.0.3",
  "algosdk": "^3.4.0"
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Algorand Network Configuration
NEXT_PUBLIC_ALGORAND_NETWORK=testnet
# Options: testnet, mainnet

# WalletConnect Configuration (Optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Wallet Configuration

The wallet configuration is located in `lib/txnlab-wallet-config.ts`:

```typescript
export const walletManagerConfig: WalletManagerConfig = {
  wallets: [
    WalletId.PERA,
    WalletId.DEFLY,
    WalletId.EXODUS,
    WalletId.LUTE,
    WalletId.DAFFI,
    ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? [WalletId.WALLETCONNECT] : [])
  ],
  networks: {
    [NetworkId.TESTNET]: {
      algod: {
        token: '',
        baseServer: 'https://testnet-api.algonode.cloud',
        port: 443
      }
    },
    [NetworkId.MAINNET]: {
      algod: {
        token: '',
        baseServer: 'https://mainnet-api.algonode.cloud',
        port: 443
      }
    }
  },
  defaultNetwork: ALGORAND_NETWORK
}
```

## 🎯 Usage

### Basic Wallet Connection

```tsx
import { useWalletConnection, useWalletActions } from '@/components/providers/txnlab-wallet-provider'

function MyComponent() {
  const { isConnected, activeAccount, activeWallet } = useWalletConnection()
  const { connect, disconnect } = useWalletActions()

  const handleConnect = async () => {
    try {
      await connect(WalletId.PERA)
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected to {activeWallet}</p>
          <p>Account: {activeAccount?.address}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
    </div>
  )
}
```

### Using Wallet Components

```tsx
import AlgorandWalletConnect from '@/components/algorand-wallet-connect'
import WalletStatus from '@/components/wallet-status'
import TransactionSigner from '@/components/transaction-signer'

function WalletPage() {
  return (
    <div>
      {/* Button variant */}
      <AlgorandWalletConnect variant="button" />
      
      {/* Dropdown variant */}
      <AlgorandWalletConnect variant="dropdown" />
      
      {/* Card variant */}
      <AlgorandWalletConnect variant="card" />
      
      {/* Wallet status */}
      <WalletStatus showDetails={true} />
      
      {/* Transaction signer */}
      <TransactionSigner 
        transactions={myTransactions}
        onSigned={(signed) => console.log('Signed:', signed)}
        onError={(error) => console.error('Error:', error)}
      />
    </div>
  )
}
```

### Transaction Signing

```tsx
import { useWalletActions } from '@/components/providers/txnlab-wallet-provider'
import { algosdk } from 'algosdk'

function TransactionExample() {
  const { signTransactions } = useWalletActions()

  const createAndSignTransaction = async () => {
    // Create transaction
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: activeAccount.address,
      to: 'RECIPIENT_ADDRESS',
      amount: 1000000, // 1 ALGO in microAlgos
      suggestedParams: {
        fee: 1000,
        firstRound: 1,
        lastRound: 1000,
        genesisID: 'testnet-v1.0',
        genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        flatFee: true
      }
    })

    try {
      // Sign transaction
      const signedTxns = await signTransactions([txn])
      console.log('Signed transactions:', signedTxns)
    } catch (error) {
      console.error('Signing failed:', error)
    }
  }

  return <button onClick={createAndSignTransaction}>Sign Transaction</button>
}
```

## 🎨 Components

### AlgorandWalletConnect

A versatile wallet connection component with multiple variants:

- **Button**: Simple button that opens a modal
- **Dropdown**: Dropdown menu with wallet options
- **Card**: Full card interface with connection details

### WalletStatus

Displays current wallet connection status and account information.

### TransactionSigner

Handles transaction signing with user-friendly interface and error handling.

## 🔗 Supported Wallets

| Wallet | Mobile | Desktop | Description |
|--------|--------|---------|-------------|
| Pera | ✅ | ✅ | Most popular Algorand wallet |
| Defly | ✅ | ✅ | DeFi-focused wallet |
| Exodus | ✅ | ✅ | Multi-chain wallet |
| Lute | ❌ | ✅ | Browser extension wallet |
| Daffi | ✅ | ❌ | Mobile-first Algorand wallet |
| WalletConnect | ✅ | ✅ | Connect any mobile wallet |

## 🧪 Testing

Visit `/wallet-demo` to test all wallet functionality:

- Connect different wallets
- Switch between accounts
- Sign demo transactions
- View connection status

## 🚨 Troubleshooting

### Common Issues

1. **Wallet not connecting**: Ensure the wallet extension is installed and unlocked
2. **Transaction signing fails**: Check that the account has sufficient balance
3. **Network errors**: Verify the network configuration in `txnlab-wallet-config.ts`

### Debug Mode

Enable debug logging by setting:

```env
NEXT_PUBLIC_DEBUG=true
```

## 📚 Resources

- [TxnLab use-wallet Documentation](https://github.com/TxnLab/use-wallet)
- [Algorand JavaScript SDK](https://github.com/algorand/js-algorand-sdk)
- [Pera Wallet](https://perawallet.app/)
- [Defly Wallet](https://defly.app/)
- [WalletConnect](https://walletconnect.com/)

## 🤝 Contributing

When adding new wallet providers:

1. Install the wallet connector package
2. Add the wallet ID to `walletManagerConfig.wallets`
3. Update the `getSupportedWallets()` function
4. Test the integration thoroughly

## 📄 License

This wallet integration is part of the 10xSwap project and follows the same license terms.
