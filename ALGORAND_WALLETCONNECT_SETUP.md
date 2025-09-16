# Enhanced Algorand Wallet Connection with WalletConnect v2

This guide explains how to set up and use the enhanced Algorand wallet connection system that includes WalletConnect v2 support, wallet state persistence, account switching, and mobile wallet deep-linking.

## 🚀 Features

- **Multi-Wallet Support**: Pera, Defly, MyAlgo, Lute, Exodus, and WalletConnect
- **WalletConnect v2**: Modern protocol for connecting mobile wallets
- **State Persistence**: Wallet connections persist across browser sessions
- **Account Switching**: Switch between multiple accounts in connected wallets
- **Mobile Deep-Linking**: Direct links to open mobile wallets
- **QR Code Support**: Easy mobile wallet connection via QR codes
- **Transaction Signing**: Unified interface for signing transactions across all wallets
- **Event System**: Real-time wallet connection status updates

## 📦 Dependencies

The following packages have been installed:

```json
{
  "@walletconnect/sign-client": "^2.11.0",
  "@walletconnect/types": "^2.11.0",
  "@walletconnect/utils": "^2.11.0",
  "@perawallet/connect": "^1.3.4",
  "@blockshake/defly-connect": "^1.0.0",
  "@randlabs/myalgo-connect": "^1.4.2",
  "algosdk": "^3.4.0"
}
```

## 🔧 Environment Setup

### 1. WalletConnect Project ID

You need to get a WalletConnect Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/):

1. Visit https://cloud.walletconnect.com/
2. Create an account or sign in
3. Create a new project
4. Copy your Project ID

### 2. Environment Variables

Add these variables to your `.env.local` file:

```bash
# WalletConnect v2 Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_walletconnect_project_id_here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: Custom WalletConnect relay URL (defaults to wss://relay.walletconnect.com)
# NEXT_PUBLIC_WALLETCONNECT_RELAY_URL="wss://relay.walletconnect.com"

# Algorand Configuration (already configured)
ALGORAND_NETWORK="testnet"
ALGORAND_MNEMONIC="your_algorand_mnemonic_here"
```

**Important**: Replace `your_walletconnect_project_id_here` with your actual WalletConnect Project ID.

## 🏗️ Architecture

### Core Components

1. **WalletConnect Configuration** (`lib/walletconnect-config.ts`)
   - WalletConnect v2 client setup
   - Algorand chain configuration
   - Mobile wallet registry
   - Helper functions for URI generation

2. **Enhanced Wallet Manager** (`lib/enhanced-algorand-wallet.ts`)
   - Unified wallet connection interface
   - State persistence
   - Event system
   - Transaction signing

3. **Wallet Provider** (`components/providers/wallet-provider.tsx`)
   - React context for global wallet state
   - Custom hooks for wallet operations
   - Event handling and state management

4. **Enhanced Wallet Component** (`components/enhanced-algorand-wallet-connect.tsx`)
   - UI for wallet connection
   - QR code display for WalletConnect
   - Mobile wallet links
   - Account switching interface

## 🎯 Usage

### Basic Wallet Connection

```tsx
import { useWallet } from '@/components/providers/wallet-provider'

function MyComponent() {
  const { connectWallet, isConnected, selectedAccount } = useWallet()

  const handleConnect = async () => {
    try {
      await connectWallet('pera') // or 'defly', 'myalgo', 'walletconnect', etc.
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }

  return (
    <div>
      {isConnected ? (
        <p>Connected: {selectedAccount}</p>
      ) : (
        <button onClick={handleConnect}>Connect Pera Wallet</button>
      )}
    </div>
  )
}
```

### Using Wallet Hooks

```tsx
import { 
  useWalletConnection, 
  useWalletActions, 
  useWalletConnect 
} from '@/components/providers/wallet-provider'

function WalletInfo() {
  const { isConnected, selectedAccount, accounts } = useWalletConnection()
  const { switchAccount, signTransaction } = useWalletActions()
  const { walletConnectURI, isWalletConnectAvailable } = useWalletConnect()

  // Component logic here
}
```

### Transaction Signing

```tsx
import { useWallet } from '@/components/providers/wallet-provider'
import algosdk from 'algosdk'

function TransactionExample() {
  const { signTransaction, selectedAccount } = useWallet()

  const handleTransaction = async () => {
    try {
      // Create your transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: selectedAccount,
        to: 'RECIPIENT_ADDRESS',
        amount: 1000000, // 1 ALGO in microAlgos
        suggestedParams: await algodClient.getTransactionParams().do()
      })

      // Sign with connected wallet
      const signedTxn = await signTransaction(txn)
      
      // Submit transaction
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do()
      console.log('Transaction ID:', txId)
    } catch (error) {
      console.error('Transaction failed:', error)
    }
  }

  return <button onClick={handleTransaction}>Send Transaction</button>
}
```

## 📱 Mobile Wallet Support

### Supported Mobile Wallets

- **Pera Wallet**: Most popular Algorand mobile wallet
- **Defly Wallet**: DeFi-focused mobile wallet
- **Exodus Wallet**: Multi-chain mobile wallet

### Deep Linking

The system automatically generates deep links for mobile wallets:

```tsx
// Mobile wallet links are automatically generated when using WalletConnect
const { mobileWalletLinks } = useWalletConnect()

// Links format: https://perawallet.app/wc?uri=encoded_walletconnect_uri
```

## 🔄 State Persistence

Wallet connections automatically persist across browser sessions using localStorage:

- **Connection metadata**: Wallet type, accounts, selected account
- **Session restoration**: Automatic reconnection on page reload
- **Secure storage**: Sensitive data is not stored locally

## 🎛️ Account Switching

For wallets with multiple accounts:

```tsx
import { useWalletConnection, useWalletActions } from '@/components/providers/wallet-provider'

function AccountSwitcher() {
  const { accounts, selectedAccount } = useWalletConnection()
  const { switchAccount } = useWalletActions()

  return (
    <select 
      value={selectedAccount} 
      onChange={(e) => switchAccount(e.target.value)}
    >
      {accounts.map(account => (
        <option key={account} value={account}>
          {account.slice(0, 6)}...{account.slice(-6)}
        </option>
      ))}
    </select>
  )
}
```

## 🐛 Troubleshooting

### Common Issues

1. **WalletConnect not working**
   - Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly
   - Check that your domain is added to your WalletConnect project settings

2. **Mobile wallet not opening**
   - Ensure the mobile wallet app is installed
   - Check that deep linking is enabled in your app settings

3. **Connection not persisting**
   - Check browser localStorage permissions
   - Ensure the wallet provider is properly wrapped around your app

4. **Transaction signing fails**
   - Verify the wallet is still connected
   - Check transaction parameters are valid
   - Ensure sufficient balance for fees

### Debug Mode

Enable debug logging by adding to your environment:

```bash
NEXT_PUBLIC_DEBUG_WALLET=true
```

## 🔒 Security Considerations

- **Private Keys**: Never stored locally - always remain in the wallet
- **Session Data**: Only connection metadata is persisted
- **Network Security**: All communications use secure WebSocket connections
- **Wallet Validation**: All transactions require explicit user approval in the wallet

## 📚 API Reference

### WalletManager Methods

```typescript
// Connection
await walletManager.connectWallet(walletType: WalletType)
walletManager.disconnect()

// Account Management
await walletManager.switchAccount(accountAddress: string)
walletManager.getAccounts(): string[]
walletManager.getSelectedAccount(): string | null

// Transaction Signing
await walletManager.signTransaction(txn: any): Promise<Uint8Array>

// State
walletManager.isConnected(): boolean
walletManager.getConnection(): WalletConnection | null
```

### Wallet Context Hooks

```typescript
// Main hook
const wallet = useWallet()

// Specialized hooks
const connection = useWalletConnection()
const actions = useWalletActions()
const walletConnect = useWalletConnect()
```

## 🚀 Next Steps

1. **Get WalletConnect Project ID** from https://cloud.walletconnect.com/
2. **Update environment variables** with your Project ID
3. **Test wallet connections** with different wallet types
4. **Implement transaction signing** in your application
5. **Test mobile wallet connections** using QR codes and deep links

## 📞 Support

For issues related to:
- **WalletConnect**: Visit [WalletConnect Documentation](https://docs.walletconnect.com/)
- **Pera Wallet**: Visit [Pera Wallet Documentation](https://docs.perawallet.app/)
- **Algorand SDK**: Visit [Algorand Developer Portal](https://developer.algorand.org/)

---

Your enhanced Algorand wallet connection system is now ready! 🎉