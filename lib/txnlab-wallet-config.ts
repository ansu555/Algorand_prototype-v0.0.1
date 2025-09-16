import { 
  WalletManager, 
  WalletId, 
  NetworkId,
  type WalletManagerConfig 
} from '@txnlab/use-wallet'

// Network configuration
const ALGORAND_NETWORK = (process.env.NEXT_PUBLIC_ALGORAND_NETWORK || 'testnet') as NetworkId

// Wallet configuration for TxnLab use-wallet
export const walletManagerConfig: WalletManagerConfig = {
  wallets: [
    WalletId.PERA,
    WalletId.DEFLY,
    WalletId.EXODUS,
    WalletId.LUTE,
    // WalletId.DAFFI,
    // Temporarily disable WalletConnect to avoid dependency issues
    // ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? [WalletId.WALLETCONNECT] : [])
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

// WalletConnect specific configuration
export const walletConnectConfig = {
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  metadata: {
    name: '10x Swap',
    description: 'Advanced cryptocurrency trading platform with AI-powered insights',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://10xswap.com',
    icons: ['https://10xswap.com/logo.png']
  }
}

// Export wallet manager config for React provider
// Note: We don't initialize the WalletManager here anymore since we're using the React provider

// Helper function to get supported wallets info
export const getSupportedWallets = () => [
  {
    id: WalletId.PERA,
    name: 'Pera Wallet',
    description: 'Most popular Algorand wallet',
    icon: '🔷',
    mobile: true,
    desktop: true
  },
  {
    id: WalletId.DEFLY,
    name: 'Defly Wallet', 
    description: 'DeFi-focused wallet',
    icon: '🦋',
    mobile: true,
    desktop: true
  },
  {
    id: WalletId.EXODUS,
    name: 'Exodus Wallet',
    description: 'Multi-chain wallet',
    icon: '🚀',
    mobile: true,
    desktop: true
  },
  {
    id: WalletId.LUTE,
    name: 'Lute Wallet',
    description: 'Browser extension wallet',
    icon: '🎵',
    mobile: false,
    desktop: true
  },
  // {
  //   id: WalletId.DAFFI,
  //   name: 'Daffi Wallet',
  //   description: 'Mobile-first Algorand wallet',
  //   icon: '🌊',
  //   mobile: true,
  //   desktop: false
  // },
  ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? [{
    id: WalletId.WALLETCONNECT,
    name: 'WalletConnect',
    description: 'Connect any mobile wallet',
    icon: '🔗',
    mobile: true,
    desktop: true
  }] : [])
]

// Export wallet manager for global use
export { WalletId, NetworkId }