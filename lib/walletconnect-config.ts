import { SignClient } from '@walletconnect/sign-client'
import { SessionTypes } from '@walletconnect/types'

// WalletConnect v2 configuration
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export const WALLETCONNECT_METADATA = {
  name: '10x Swap',
  description: 'Advanced cryptocurrency trading platform with AI-powered insights',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://10xswap.com',
  icons: ['https://10xswap.com/logo.png']
}

// Algorand chain configuration for WalletConnect
export const ALGORAND_CHAINS = {
  mainnet: 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k',
  testnet: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe'
}

export const ALGORAND_METHODS = [
  'algo_signTxn',
  'algo_signAndPostTxn',
  'algo_signTxnGroup',
  'algo_signAndPostTxnGroup',
  'algo_getAccounts'
]

export const ALGORAND_EVENTS = [
  'accountsChanged',
  'chainChanged'
]

// WalletConnect session configuration
export const SESSION_CONFIG = {
  requiredNamespaces: {
    algorand: {
      methods: ALGORAND_METHODS,
      chains: [ALGORAND_CHAINS.testnet, ALGORAND_CHAINS.mainnet],
      events: ALGORAND_EVENTS
    }
  },
  optionalNamespaces: {},
  sessionProperties: {}
}

// Initialize WalletConnect Sign Client
export async function createWalletConnectClient() {
  if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error('WalletConnect Project ID is required. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your environment variables.')
  }

  const signClient = await SignClient.init({
    projectId: WALLETCONNECT_PROJECT_ID,
    metadata: WALLETCONNECT_METADATA,
    relayUrl: 'wss://relay.walletconnect.com'
  })

  return signClient
}

// Helper function to get active sessions
export function getActiveSessions(signClient: SignClient): SessionTypes.Struct[] {
  return Object.values(signClient.session.getAll())
}

// Helper function to get Algorand accounts from session
export function getAlgorandAccounts(session: SessionTypes.Struct): string[] {
  const algorandNamespace = session.namespaces.algorand
  if (!algorandNamespace) return []
  
  return algorandNamespace.accounts.map(account => {
    // Extract address from account string format: "algorand:chainId:address"
    return account.split(':')[2]
  })
}

// Helper function to format transaction for WalletConnect
export function formatTransactionForWalletConnect(txn: any) {
  return {
    txn: Buffer.from(txn.toByte()).toString('base64'),
    message: 'Sign transaction',
    // Add any additional metadata if needed
  }
}

// Mobile wallet deep linking configuration
export const MOBILE_WALLET_REGISTRY = {
  pera: {
    name: 'Pera Wallet',
    shortName: 'pera',
    color: '#FFAE00',
    logo: 'https://perawallet.app/icons/pera-wallet.svg',
    universalLink: 'https://perawallet.app/wc',
    deepLink: 'perawallet-wc://'
  },
  defly: {
    name: 'Defly Wallet',
    shortName: 'defly',
    color: '#1C1C1C',
    logo: 'https://defly.app/logo.svg',
    universalLink: 'https://defly.app/wc',
    deepLink: 'defly-wc://'
  },
  exodus: {
    name: 'Exodus Wallet',
    shortName: 'exodus',
    color: '#1B1B3A',
    logo: 'https://exodus.com/logo.svg',
    universalLink: 'https://exodus.com/wc',
    deepLink: 'exodus-wc://'
  }
}

// Helper function to generate mobile wallet connection URI
export function generateMobileWalletURI(uri: string, walletId: keyof typeof MOBILE_WALLET_REGISTRY): string {
  const wallet = MOBILE_WALLET_REGISTRY[walletId]
  if (!wallet) return uri
  
  const encodedURI = encodeURIComponent(uri)
  return `${wallet.universalLink}?uri=${encodedURI}`
}