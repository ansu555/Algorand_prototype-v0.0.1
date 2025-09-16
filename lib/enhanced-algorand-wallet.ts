import { PeraWalletConnect } from '@perawallet/connect'
import { DeflyWalletConnect } from '@blockshake/defly-connect'
import MyAlgoConnect from '@randlabs/myalgo-connect'
import type { SignClient } from '@walletconnect/sign-client'
import type { SessionTypes } from '@walletconnect/types'

export type WalletType = 'pera' | 'defly' | 'myalgo' | 'lute' | 'exodus' | 'walletconnect'

export interface WalletConnection {
  accounts: string[]
  selectedAccount: string
  walletType: WalletType
  connector: any
  session?: SessionTypes.Struct // For WalletConnect sessions
  chainId?: string
}

export interface WalletState {
  isConnected: boolean
  connection: WalletConnection | null
  isConnecting: boolean
  error: string | null
}

class EnhancedAlgorandWalletManager {
  private connection: WalletConnection | null = null
  private peraWallet?: PeraWalletConnect
  private deflyWallet?: DeflyWalletConnect
  private myAlgoWallet?: MyAlgoConnect
  private walletConnectClient: InstanceType<typeof SignClient> | null = null
  private listeners: Map<string, Function[]> = new Map()

  // Storage keys for persistence
  private readonly STORAGE_KEYS = {
    CONNECTION: 'algorand_wallet_connection',
    WALLET_TYPE: 'algorand_wallet_type',
    SELECTED_ACCOUNT: 'algorand_selected_account'
  }

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.peraWallet = new PeraWalletConnect({
        chainId: 416002 // Testnet
      })
      this.deflyWallet = new DeflyWalletConnect({
        chainId: 416002
      })
      this.myAlgoWallet = new MyAlgoConnect()

      // Initialize WalletConnect client
      this.initializeWalletConnect()

      // Restore connection from storage
      this.restoreConnection()
    }
  }

  private async initializeWalletConnect() {
    try {
      // Dynamic import to reduce initial bundle size
      const { createWalletConnectClient } = await import('./walletconnect-config')
      this.walletConnectClient = await createWalletConnectClient()
      this.setupWalletConnectListeners()
    } catch (error) {
      console.warn('WalletConnect initialization failed:', error)
    }
  }

  private setupWalletConnectListeners() {
    if (!this.walletConnectClient) return

    this.walletConnectClient.on('session_proposal', async (proposal: any) => {
      // Handle session proposal if needed
      console.log('Session proposal received:', proposal)
    })

    this.walletConnectClient.on('session_request', async (requestEvent: any) => {
      // Handle session requests (transaction signing, etc.)
      console.log('Session request received:', requestEvent)
    })

    this.walletConnectClient.on('session_delete', (deleteEvent: any) => {
      // Handle session deletion
      console.log('Session deleted:', deleteEvent)
      if (this.connection?.walletType === 'walletconnect') {
        this.disconnect()
      }
    })
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  // Persistence methods
  private saveConnection() {
    if (typeof window === 'undefined') return

    try {
      if (this.connection) {
        localStorage.setItem(this.STORAGE_KEYS.WALLET_TYPE, this.connection.walletType)
        localStorage.setItem(this.STORAGE_KEYS.SELECTED_ACCOUNT, this.connection.selectedAccount)
        
        // Don't store sensitive connector data, just the connection metadata
        const connectionData = {
          accounts: this.connection.accounts,
          selectedAccount: this.connection.selectedAccount,
          walletType: this.connection.walletType,
          chainId: this.connection.chainId
        }
        localStorage.setItem(this.STORAGE_KEYS.CONNECTION, JSON.stringify(connectionData))
      }
    } catch (error) {
      console.warn('Failed to save wallet connection:', error)
    }
  }

  private restoreConnection() {
    if (typeof window === 'undefined') return

    try {
      const savedConnection = localStorage.getItem(this.STORAGE_KEYS.CONNECTION)
      const savedWalletType = localStorage.getItem(this.STORAGE_KEYS.WALLET_TYPE) as WalletType
      
      if (savedConnection && savedWalletType) {
        const connectionData = JSON.parse(savedConnection)
        
        // For WalletConnect, check if session still exists
        if (savedWalletType === 'walletconnect' && this.walletConnectClient) {
          const sessions = this.walletConnectClient.session.getAll()
          const activeSession = sessions.find((session: any) => {
            // Simple check for account in session namespaces
            const algorandNamespace = session.namespaces?.algorand
            if (!algorandNamespace) return false
            
            return algorandNamespace.accounts?.some((account: string) =>
              account.split(':')[2] === connectionData.selectedAccount
            )
          })
          
          if (activeSession) {
            this.connection = {
              ...connectionData,
              connector: this.walletConnectClient,
              session: activeSession
            }
            this.emit('connectionRestored', this.connection)
          }
        } else {
          // For other wallets, attempt to restore connection
          // Note: This might require re-authentication depending on the wallet
          this.emit('connectionRestored', connectionData)
        }
      }
    } catch (error) {
      console.warn('Failed to restore wallet connection:', error)
    }
  }

  async connectWallet(walletType: WalletType): Promise<string[]> {
    this.emit('connecting', { walletType })
    
    try {
      let accounts: string[] = []
      let connector: any
      let session: SessionTypes.Struct | undefined

      switch (walletType) {
        case 'pera':
          if (!this.peraWallet) throw new Error('Pera wallet not initialized')
          accounts = await this.peraWallet.connect()
          connector = this.peraWallet
          break
          
        case 'defly':
          if (!this.deflyWallet) throw new Error('Defly wallet not initialized')
          accounts = await this.deflyWallet.connect()
          connector = this.deflyWallet
          break
          
        case 'myalgo':
          if (!this.myAlgoWallet) throw new Error('MyAlgo wallet not initialized')
          const myAlgoAccounts = await this.myAlgoWallet.connect()
          accounts = myAlgoAccounts.map(acc => acc.address)
          connector = this.myAlgoWallet
          break
          
        case 'lute':
          if (typeof window !== 'undefined' && (window as any).algorand) {
            const luteAccounts = await (window as any).algorand.connect()
            accounts = luteAccounts
            connector = (window as any).algorand
          } else {
            throw new Error('Lute wallet not detected. Please install Lute wallet extension.')
          }
          break
          
        case 'exodus':
          if (typeof window !== 'undefined' && (window as any).algorand?.isExodus) {
            const exodusAccounts = await (window as any).algorand.connect()
            accounts = exodusAccounts
            connector = (window as any).algorand
          } else {
            throw new Error('Exodus wallet not detected. Please install Exodus wallet.')
          }
          break

        case 'walletconnect':
          if (!this.walletConnectClient) {
            throw new Error('WalletConnect client not initialized')
          }
          
          // Dynamic import for WalletConnect utilities
          const {
            SESSION_CONFIG,
            getAlgorandAccounts,
            generateMobileWalletURI,
            MOBILE_WALLET_REGISTRY
          } = await import('./walletconnect-config')
          
          const { uri, approval } = await this.walletConnectClient.connect(SESSION_CONFIG)
          
          if (uri) {
            // Emit URI for QR code display or mobile wallet linking
            this.emit('walletConnectURI', { uri, walletType })
            
            // For mobile wallets, generate deep links
            Object.keys(MOBILE_WALLET_REGISTRY).forEach(walletId => {
              const mobileURI = generateMobileWalletURI(uri, walletId as keyof typeof MOBILE_WALLET_REGISTRY)
              this.emit('mobileWalletLink', { walletId, uri: mobileURI })
            })
          }

          // Wait for session approval
          session = await approval()
          if (session) {
            accounts = getAlgorandAccounts(session)
            connector = this.walletConnectClient
          }
          break
          
        default:
          throw new Error(`Unsupported wallet: ${walletType}`)
      }

      this.connection = {
        accounts,
        selectedAccount: accounts[0],
        walletType,
        connector,
        session,
        chainId: walletType === 'walletconnect' ? session?.namespaces.algorand?.chains?.[0] : undefined
      }

      this.saveConnection()
      this.emit('connected', this.connection)
      
      return accounts
    } catch (error: any) {
      this.emit('error', error)
      throw new Error(`Failed to connect ${walletType}: ${error.message}`)
    }
  }

  async signTransaction(txn: any): Promise<Uint8Array> {
    if (!this.connection) {
      throw new Error('No wallet connected')
    }

    const { walletType, connector, session } = this.connection

    try {
      switch (walletType) {
        case 'pera':
          const peraSigned = await connector.signTransaction([txn])
          return peraSigned[0]
          
        case 'defly':
          const deflySigned = await connector.signTransaction([txn])
          return deflySigned[0]
          
        case 'myalgo':
          const myAlgoSigned = await connector.signTransaction(txn)
          return myAlgoSigned.blob
          
        case 'lute':
        case 'exodus':
          const browserSigned = await connector.signTransaction(txn)
          return browserSigned

        case 'walletconnect':
          if (!this.walletConnectClient || !session) {
            throw new Error('WalletConnect session not available')
          }

          // Dynamic import for transaction formatting
          const { formatTransactionForWalletConnect } = await import('./walletconnect-config')
          const formattedTxn = formatTransactionForWalletConnect(txn)
          const request = {
            topic: session.topic,
            chainId: session.namespaces.algorand?.chains?.[0] || 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe',
            request: {
              method: 'algo_signTxn',
              params: [formattedTxn]
            }
          }

          const result = await this.walletConnectClient.request(request) as string[]
          return new Uint8Array(Buffer.from(result[0], 'base64'))
          
        default:
          throw new Error(`Signing not implemented for ${walletType}`)
      }
    } catch (error: any) {
      this.emit('error', error)
      throw new Error(`Failed to sign transaction: ${error.message}`)
    }
  }

  async switchAccount(accountAddress: string): Promise<void> {
    if (!this.connection) {
      throw new Error('No wallet connected')
    }

    if (!this.connection.accounts.includes(accountAddress)) {
      throw new Error('Account not found in connected accounts')
    }

    this.connection.selectedAccount = accountAddress
    this.saveConnection()
    this.emit('accountChanged', { account: accountAddress })
  }

  disconnect() {
    if (this.connection) {
      const { walletType, connector, session } = this.connection
      
      switch (walletType) {
        case 'pera':
          connector.disconnect()
          break
        case 'defly':
          connector.disconnect()
          break
        case 'walletconnect':
          if (this.walletConnectClient && session) {
            this.walletConnectClient.disconnect({
              topic: session.topic,
              reason: {
                code: 6000,
                message: 'User disconnected'
              }
            })
          }
          break
        // MyAlgo and browser wallets don't need explicit disconnect
      }
      
      this.connection = null
      
      // Clear storage
      if (typeof window !== 'undefined') {
        Object.values(this.STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key)
        })
      }

      this.emit('disconnected')
    }
  }

  getConnection(): WalletConnection | null {
    return this.connection
  }

  isConnected(): boolean {
    return this.connection !== null
  }

  getSelectedAccount(): string | null {
    return this.connection?.selectedAccount || null
  }

  getAccounts(): string[] {
    return this.connection?.accounts || []
  }

  getWalletType(): WalletType | null {
    return this.connection?.walletType || null
  }

  // Get WalletConnect sessions
  getWalletConnectSessions(): SessionTypes.Struct[] {
    if (!this.walletConnectClient) return []
    return this.walletConnectClient.session.getAll()
  }

  // Check if WalletConnect is available
  isWalletConnectAvailable(): boolean {
    return this.walletConnectClient !== null
  }
}

export const enhancedWalletManager = new EnhancedAlgorandWalletManager()