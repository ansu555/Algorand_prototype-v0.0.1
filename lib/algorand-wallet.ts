import { PeraWalletConnect } from '@perawallet/connect'
import { DeflyWalletConnect } from '@blockshake/defly-connect'
import MyAlgoConnect from '@randlabs/myalgo-connect'

export type WalletType = 'pera' | 'defly' | 'myalgo' | 'lute' | 'exodus'

interface WalletConnection {
  accounts: string[]
  selectedAccount: string
  walletType: WalletType
  connector: any
}

class AlgorandWalletManager {
  private connection: WalletConnection | null = null
  private peraWallet: PeraWalletConnect
  private deflyWallet: DeflyWalletConnect
  private myAlgoWallet: MyAlgoConnect

  constructor() {
    this.peraWallet = new PeraWalletConnect({
      chainId: 416002 // Testnet
    })
    this.deflyWallet = new DeflyWalletConnect({
      chainId: 416002
    })
    this.myAlgoWallet = new MyAlgoConnect()
  }

  async connectWallet(walletType: WalletType): Promise<string[]> {
    try {
      let accounts: string[] = []
      let connector: any

      switch (walletType) {
        case 'pera':
          accounts = await this.peraWallet.connect()
          connector = this.peraWallet
          break
          
        case 'defly':
          accounts = await this.deflyWallet.connect()
          connector = this.deflyWallet
          break
          
        case 'myalgo':
          const myAlgoAccounts = await this.myAlgoWallet.connect()
          accounts = myAlgoAccounts.map(acc => acc.address)
          connector = this.myAlgoWallet
          break
          
        case 'lute':
          // Lute wallet uses WalletConnect protocol
          if (typeof window !== 'undefined' && (window as any).algorand) {
            const luteAccounts = await (window as any).algorand.connect()
            accounts = luteAccounts
            connector = (window as any).algorand
          } else {
            throw new Error('Lute wallet not detected. Please install Lute wallet extension.')
          }
          break
          
        case 'exodus':
          // Exodus uses window.algorand
          if (typeof window !== 'undefined' && (window as any).algorand?.isExodus) {
            const exodusAccounts = await (window as any).algorand.connect()
            accounts = exodusAccounts
            connector = (window as any).algorand
          } else {
            throw new Error('Exodus wallet not detected. Please install Exodus wallet.')
          }
          break
          
        default:
          throw new Error(`Unsupported wallet: ${walletType}`)
      }

      this.connection = {
        accounts,
        selectedAccount: accounts[0],
        walletType,
        connector
      }

      return accounts
    } catch (error: any) {
      throw new Error(`Failed to connect ${walletType}: ${error.message}`)
    }
  }

  async signTransaction(txn: any): Promise<Uint8Array> {
    if (!this.connection) {
      throw new Error('No wallet connected')
    }

    const { walletType, connector } = this.connection

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
          
        default:
          throw new Error(`Signing not implemented for ${walletType}`)
      }
    } catch (error: any) {
      throw new Error(`Failed to sign transaction: ${error.message}`)
    }
  }

  disconnect() {
    if (this.connection) {
      const { walletType, connector } = this.connection
      
      switch (walletType) {
        case 'pera':
          connector.disconnect()
          break
        case 'defly':
          connector.disconnect()
          break
        // MyAlgo and browser wallets don't need explicit disconnect
      }
      
      this.connection = null
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
}

export const walletManager = new AlgorandWalletManager()
