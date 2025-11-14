import algosdk from 'algosdk'
import crypto from 'crypto'
import { createAgentWallet, getAgentWallet, type AgentWallet } from './db'
import { getAlgodClient, ALGORAND_ASSETS } from './algorand'

// Encryption utilities
const ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY = process.env.AGENT_WALLET_ENCRYPTION_KEY || 'default-key-change-in-production-32b'

function getEncryptionKey(): Buffer {
  // Ensure key is exactly 32 bytes for AES-256
  const key = ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)
  return Buffer.from(key)
}

function encryptMnemonic(mnemonic: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  
  let encrypted = cipher.update(mnemonic, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function decryptMnemonic(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
  
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Generate a unique ID based on user address
 */
function generateAgentWalletId(userAddress: string): string {
  return `agent_${userAddress.toLowerCase()}_${Date.now()}`
}

/**
 * Get or create an agent wallet for a user
 */
export async function getOrCreateAgentWallet(userAddress: string): Promise<{
  agentAddress: string
  agentMnemonic: string
  isNew: boolean
}> {
  // Normalize user address
  const normalizedUserAddress = userAddress.trim().toUpperCase()
  
  if (!algosdk.isValidAddress(normalizedUserAddress)) {
    throw new Error('Invalid user address')
  }

  // Check if agent wallet already exists
  const existing = await getAgentWallet(normalizedUserAddress)
  
  if (existing) {
    // Decrypt and return existing wallet
    const mnemonic = decryptMnemonic(existing.encryptedMnemonic)
    return {
      agentAddress: existing.agentAddress,
      agentMnemonic: mnemonic,
      isNew: false
    }
  }

  // Generate new agent wallet
  const account = algosdk.generateAccount()
  const mnemonic = algosdk.secretKeyToMnemonic(account.sk)
  
  // Encrypt mnemonic for storage
  const encryptedMnemonic = encryptMnemonic(mnemonic)
  
  // Store in database
  const walletData: AgentWallet = {
    id: generateAgentWalletId(normalizedUserAddress),
    userAddress: normalizedUserAddress,
    agentAddress: account.addr.toString(),
    encryptedMnemonic,
    createdAt: new Date().toISOString()
  }
  
  await createAgentWallet(walletData)
  
  return {
    agentAddress: account.addr.toString(),
    agentMnemonic: mnemonic,
    isNew: true
  }
}

/**
 * Build an agent instance for a specific user
 */
export async function buildUserAgentWallet(userAddress: string) {
  const { agentAddress, agentMnemonic } = await getOrCreateAgentWallet(userAddress)
  
  const account = algosdk.mnemonicToSecretKey(agentMnemonic)
  const algodClient = getAlgodClient()
  const network = (process.env.ALGORAND_NETWORK || 'testnet') as 'mainnet' | 'testnet'
  
  async function getBalance(assetId?: number): Promise<string> {
    try {
      const accountInfo = await algodClient.accountInformation(account.addr).do()
      
      if (!assetId || assetId === 0) {
        return (Number(accountInfo.amount) / 1_000_000).toString()
      }
      
      const asset = accountInfo.assets?.find((a: any) => Number(a['asset-id'] ?? a.assetId) === assetId)
      if (!asset) return '0'
      
      const networkAssets = ALGORAND_ASSETS[network]
      const assetKey = Object.keys(networkAssets).find(key => 
        networkAssets[key as keyof typeof networkAssets].id === assetId
      )
      
      if (!assetKey) return '0'
      const assetInfo = networkAssets[assetKey as keyof typeof networkAssets]
      
      return (Number(asset.amount) / Math.pow(10, assetInfo?.decimals || 6)).toString()
    } catch (e: any) {
      throw new Error(`getBalance failed: ${e?.message || e}`)
    }
  }
  
  async function optInToAsset(assetId: number): Promise<string> {
    try {
      const suggestedParams = await algodClient.getTransactionParams().do()
      
      // Check if already opted in
      const accountInfo = await algodClient.accountInformation(account.addr).do()
      const hasOptIn = (accountInfo.assets || []).some((a: any) => 
        Number(a['asset-id'] ?? a.assetId) === assetId
      )
      
      if (hasOptIn) {
        return 'Already opted in'
      }
      
      // Create opt-in transaction
      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: account.addr,
        receiver: account.addr,
        amount: 0,
        assetIndex: assetId,
        suggestedParams
      })
      
      const signedOptIn = optInTxn.signTxn(account.sk)
      const response = await algodClient.sendRawTransaction(signedOptIn).do()
      await algosdk.waitForConfirmation(algodClient, response.txid, 6)
      
      return response.txid
    } catch (e: any) {
      throw new Error(`optInToAsset failed: ${e?.message || e}`)
    }
  }
  
  async function getAccountInfo() {
    try {
      const accountInfo = await algodClient.accountInformation(account.addr).do()
      
      const algoBalance = Number(accountInfo.amount) / 1_000_000
      const minBalance = Number((accountInfo as any)['min-balance'] ?? accountInfo.minBalance ?? 0) / 1_000_000
      
      const assets = []
      
      if (accountInfo.assets) {
        for (const asset of accountInfo.assets) {
          const assetId = Number((asset as any)['asset-id'] ?? asset.assetId)
          const assetEntry = Object.entries(ALGORAND_ASSETS[network]).find(
            ([_, info]) => info.id === assetId
          )
          
          if (assetEntry) {
            const [symbol, info] = assetEntry
            const balance = Number(asset.amount) / Math.pow(10, info.decimals)
            
            assets.push({
              assetId,
              symbol,
              balance: balance.toString(),
              decimals: info.decimals
            })
          }
        }
      }
      
      return {
        address: account.addr.toString(),
        algoBalance,
        minBalance,
        availableBalance: Math.max(0, algoBalance - minBalance),
        assets,
        totalAssets: accountInfo.assets?.length || 0
      }
    } catch (e: any) {
      throw new Error(`getAccountInfo failed: ${e?.message || e}`)
    }
  }
  
  async function transfer(opts: {
    to: string
    assetId: number
    amount: number
    note?: string
  }): Promise<{ txId: string; details: any }> {
    try {
      const { to, assetId, amount, note } = opts
      
      if (!algosdk.isValidAddress(to)) {
        throw new Error('Invalid recipient address')
      }
      
      if (!(amount > 0)) {
        throw new Error('Amount must be greater than 0')
      }
      
      const suggestedParams = await algodClient.getTransactionParams().do()
      suggestedParams.flatFee = true
      suggestedParams.fee = BigInt(1000)
      
      let txn: algosdk.Transaction
      let txId: string
      
      if (assetId === 0) {
        // ALGO transfer
        const amountMicroAlgos = Math.round(amount * 1_000_000)
        txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: account.addr,
          receiver: to,
          amount: amountMicroAlgos,
          suggestedParams,
          note: note ? new Uint8Array(Buffer.from(note)) : undefined
        })
        
        const signedTxn = txn.signTxn(account.sk)
        const response = await algodClient.sendRawTransaction(signedTxn).do()
        txId = response.txid
        
        await algosdk.waitForConfirmation(algodClient, txId, 6)
      } else {
        // ASA transfer
        const assetInfo = Object.values(ALGORAND_ASSETS[network]).find(a => a.id === assetId)
        if (!assetInfo) throw new Error(`Unknown asset ID: ${assetId}`)
        
        const amountUnits = Math.round(amount * Math.pow(10, assetInfo.decimals))
        txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: account.addr,
          receiver: to,
          amount: amountUnits,
          assetIndex: assetId,
          suggestedParams,
          note: note ? new Uint8Array(Buffer.from(note)) : undefined
        })
        
        const signedTxn = txn.signTxn(account.sk)
        const response = await algodClient.sendRawTransaction(signedTxn).do()
        txId = response.txid
        
        await algosdk.waitForConfirmation(algodClient, txId, 6)
      }
      
      return {
        txId,
        details: {
          from: account.addr.toString(),
          to,
          amount,
          assetId,
          note,
          network,
          explorerUrl: `https://lora.algokit.io/${network === 'mainnet' ? 'mainnet' : 'testnet'}/transaction/${txId}`
        }
      }
    } catch (e: any) {
      throw new Error(`transfer failed: ${e?.message || e}`)
    }
  }
  
  return {
    address: agentAddress,
    account,
    algodClient,
    network,
    getBalance,
    optInToAsset,
    getAccountInfo,
    transfer,
    assets: ALGORAND_ASSETS[network]
  }
}

export type UserAgentWallet = Awaited<ReturnType<typeof buildUserAgentWallet>>
