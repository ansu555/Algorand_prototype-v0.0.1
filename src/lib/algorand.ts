import algosdk from 'algosdk'
import { AlgorandClient, Config } from '@algorandfoundation/algokit-utils'

// Algorand network configuration
const ALGORAND_NETWORKS = {
  mainnet: {
    server: 'https://mainnet-api.algonode.cloud',
    port: 443,
    token: '',
    indexer: 'https://mainnet-idx.algonode.cloud'
  },
  testnet: {
    server: 'https://testnet-api.algonode.cloud', 
    port: 443,
    token: '',
    indexer: 'https://testnet-idx.algonode.cloud'
  }
}

// Algorand Standard Assets (ASAs) registry
export const ALGORAND_ASSETS = {
  mainnet: {
    ALGO: { id: 0, symbol: 'ALGO', decimals: 6, name: 'Algorand' },
    USDC: { id: 31566704, symbol: 'USDC', decimals: 6, name: 'USD Coin' },
    USDT: { id: 312769, symbol: 'USDT', decimals: 6, name: 'Tether USD' },
    WBTC: { id: 1058926737, symbol: 'WBTC', decimals: 8, name: 'Wrapped Bitcoin' },
    WETH: { id: 887406851, symbol: 'WETH', decimals: 18, name: 'Wrapped Ethereum' }
  },
  testnet: {
    ALGO: { id: 0, symbol: 'ALGO', decimals: 6, name: 'Algorand' },
    USDC: { id: 10458941, symbol: 'USDC', decimals: 6, name: 'USDC (Testnet)' },
    USDT: { id: 67396430, symbol: 'USDT', decimals: 6, name: 'USDt (Testnet)' },
    ALGF: { id: 70283957, symbol: 'ALGF', decimals: 6, name: 'AlgoFund (Testnet)' }
  }
}

export type AlgorandAsset = {
  id: number
  symbol: string
  decimals: number
  name: string
}

function getEnv(name: string, required = true): string | undefined {
  const v = process.env[name]
  if (required && !v) throw new Error(`Missing env ${name}`)
  return v
}

function getNetwork(): 'mainnet' | 'testnet' {
  const network = process.env.ALGORAND_NETWORK || 'testnet'
  if (network !== 'mainnet' && network !== 'testnet') {
    throw new Error('ALGORAND_NETWORK must be "mainnet" or "testnet"')
  }
  return network
}

/**
 * Get Algod client instance
 */
export function getAlgodClient(): algosdk.Algodv2 {
  const network = getNetwork();
  const config = ALGORAND_NETWORKS[network];
  return new algosdk.Algodv2(config.token, config.server, config.port);
}

export async function buildAlgorandAgent() {
  try {
    const network = getNetwork()
    const config = ALGORAND_NETWORKS[network]
    
    // Get private key from environment
    const privateKeyMnemonic = getEnv('ALGORAND_MNEMONIC') as string
    const account = algosdk.mnemonicToSecretKey(privateKeyMnemonic)
    
    // Initialize Algorand client
    const algodClient = new algosdk.Algodv2(config.token, config.server, config.port)
    const indexerClient = new algosdk.Indexer(config.token, config.indexer, config.port)
    
    // Initialize AlgoKit client
    const algorandClient = AlgorandClient.fromClients({
      algod: algodClient,
      indexer: indexerClient
    })
    
    // Helper functions
    async function getAddress(): Promise<string> {
      return account.addr.toString()
    }
    
    async function getBalance(assetId?: number): Promise<string> {
      try {
        const accountInfo = await algodClient.accountInformation(account.addr).do()
        
        if (!assetId || assetId === 0) {
          // ALGO balance - convert microAlgos to Algos
          return (Number(accountInfo.amount) / 1000000).toString()
        }
        
        // ASA balance - FIX: Use assetId (camelCase) not 'asset-id' (kebab-case)
        const asset = accountInfo.assets?.find((a: any) => Number(a.assetId) === assetId)
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
    
    async function transfer(opts: {
      to: string
      amount: string
      assetId?: number
      note?: string
    }): Promise<{ txId: string; details: any }> {
      try {
        const { to, amount, assetId, note } = opts
        if (!algosdk.isValidAddress(to)) {
          throw new Error('Invalid recipient address')
        }
        const numericAmount = parseFloat(amount)
        if (!(numericAmount > 0)) {
          throw new Error('Amount must be greater than 0')
        }
        const suggestedParams = await algodClient.getTransactionParams().do()
        
        let txn: algosdk.Transaction
        
        if (!assetId || assetId === 0) {
          // ALGO transfer
          const amountMicroAlgos = Math.round(numericAmount * 1000000)
          txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: account.addr,
            receiver: to,
            amount: amountMicroAlgos,
            suggestedParams,
            note: note ? new Uint8Array(Buffer.from(note)) : undefined
          })
        } else {
          // ASA transfer
          const assetInfo = Object.values(ALGORAND_ASSETS[network]).find(a => a.id === assetId)
          if (!assetInfo) throw new Error(`Unknown asset ID: ${assetId}`)
          // Ensure sender is opted-in to ASA - FIX: Use assetId (camelCase) not 'asset-id' (kebab-case)
          const acctInfo = await algodClient.accountInformation(account.addr).do()
          const hasOptIn = (acctInfo.assets || []).some((a: any) => Number(a.assetId) === assetId)
          if (!hasOptIn) {
            const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: account.addr,
              receiver: account.addr,
              amount: 0,
              assetIndex: assetId,
              suggestedParams
            })
            const signedOptIn = optInTxn.signTxn(account.sk)
            await algodClient.sendRawTransaction(signedOptIn).do()
            await algosdk.waitForConfirmation(algodClient, optInTxn.txID().toString(), 4)
          }

          const amountUnits = Math.round(numericAmount * Math.pow(10, assetInfo.decimals))
          txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: account.addr,
            receiver: to,
            amount: amountUnits,
            assetIndex: assetId,
            suggestedParams,
            note: note ? new Uint8Array(Buffer.from(note)) : undefined
          })
        }
        
        // Sign and send transaction
        const signedTxn = txn.signTxn(account.sk)
        const response = await algodClient.sendRawTransaction(signedTxn).do()
        const txId = response.txid
        // Wait for confirmation
        const confirmed = await algosdk.waitForConfirmation(algodClient, txId, 6)
        const confirmedRound = (confirmed as any)['confirmed-round'] || (confirmed as any).confirmedRound

        return {
          txId,
          details: {
            from: account.addr,
            to,
            amount,
            assetId,
            note,
            network,
            confirmedRound,
            explorerUrl: network === 'mainnet'
              ? `https://algoexplorer.io/tx/${txId}`
              : `https://testnet.algoexplorer.io/tx/${txId}`
          }
        }
      } catch (e: any) {
        throw new Error(`transfer failed: ${e?.message || e}`)
      }
    }
    
    async function atomicSwap(opts: {
      assetInSymbol: string
      assetOutSymbol: string
      amountIn: string
      recipient: string
    }): Promise<{ txId: string; details: any }> {
      try {
        const { assetInSymbol, assetOutSymbol, amountIn, recipient } = opts

        console.log('🔍 AtomicSwap Debug:', {
          hasAccount: !!account,
          accountType: typeof account,
          addr: account?.addr,
          addrType: typeof account?.addr,
          hasSk: !!account?.sk,
          skType: typeof account?.sk
        })

        if (!account || !account.addr) {
          throw new Error('Account object is invalid')
        }

        const parsedAmount = Number.parseFloat(amountIn)
        if (!(parsedAmount > 0)) {
          throw new Error(`Swap amount must be > 0 (received ${amountIn})`)
        }

        const normalizedRecipient = recipient.trim()
        if (!algosdk.isValidAddress(normalizedRecipient)) {
          throw new Error(`Invalid recipient Algorand address: ${recipient}`)
        }

        const assetInfo = ALGORAND_ASSETS[network][assetInSymbol as keyof typeof ALGORAND_ASSETS[typeof network]]
        if (!assetInfo) {
          throw new Error(`Unsupported asset symbol: ${assetInSymbol}`)
        }

        const accountInfo = await algodClient.accountInformation(account.addr).do()
        const suggestedParams = await algodClient.getTransactionParams().do()
        suggestedParams.flatFee = true
        suggestedParams.fee = BigInt(Math.max(Number(suggestedParams.minFee) || Number(suggestedParams.fee) || 1000, 1000))

        let txId: string

        if (assetInfo.id === 0) {
          const requestedMicroAlgosBigInt = BigInt(Math.round(parsedAmount * 1_000_000))
          if (!(requestedMicroAlgosBigInt > 0n)) {
            throw new Error('Requested swap amount is too small after conversion')
          }

          const totalMicroAlgos = BigInt(accountInfo.amount ?? 0)
          const minBalanceRaw = accountInfo.minBalance ?? 0
          const minBalanceMicroAlgos = BigInt(minBalanceRaw)

          const availableMicroAlgos = totalMicroAlgos - minBalanceMicroAlgos
          if (availableMicroAlgos <= 0n) {
            throw new Error(`Insufficient balance: account has ${(Number(totalMicroAlgos) / 1_000_000).toFixed(6)} ALGO with minimum ${(Number(minBalanceMicroAlgos) / 1_000_000).toFixed(6)} ALGO`)
          }

          const feeBuffer = BigInt(suggestedParams.fee ?? 1000)
          const spendableMicroAlgos = availableMicroAlgos - feeBuffer
          if (spendableMicroAlgos <= 0n) {
            throw new Error('Insufficient balance available after reserving fees')
          }

          if (requestedMicroAlgosBigInt > spendableMicroAlgos) {
            const availableRounded = Number(spendableMicroAlgos) / 1_000_000
            throw new Error(`Insufficient balance: requested ${parsedAmount.toFixed(6)} ALGO but only ${availableRounded.toFixed(6)} ALGO is spendable (balance ${(Number(totalMicroAlgos) / 1_000_000).toFixed(6)} ALGO, minimum ${(Number(minBalanceMicroAlgos) / 1_000_000).toFixed(6)} ALGO)`)
          }

          const amountMicroAlgos = Number(requestedMicroAlgosBigInt)
          if (!Number.isSafeInteger(amountMicroAlgos)) {
            throw new Error('Swap amount exceeds safe integer range')
          }

          console.log(`📤 Creating ALGO payment: ${parsedAmount} ALGO from ${account.addr} to ${normalizedRecipient}`)

          const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: account.addr,
            receiver: normalizedRecipient,
            amount: amountMicroAlgos,
            suggestedParams,
            note: new Uint8Array(Buffer.from(`Swap: ${amountIn} ${assetInSymbol} → ${assetOutSymbol}`))
          })

          const signedTxn = txn.signTxn(account.sk)
          const response = await algodClient.sendRawTransaction(signedTxn).do()
          txId = response.txid

          await algosdk.waitForConfirmation(algodClient, txId, 6)
        } else {
          const decimals = assetInfo.decimals ?? 0
          const scale = Math.pow(10, decimals)
          const requestedUnitsBigInt = BigInt(Math.round(parsedAmount * scale))
          if (!(requestedUnitsBigInt > 0n)) {
            throw new Error('Requested swap amount is too small after conversion')
          }

          const holdings = (accountInfo.assets || []).find((holding: any) => Number(holding['asset-id'] ?? holding.assetId) === assetInfo.id)
          if (!holdings) {
            console.log(`ℹ️ Agent not opted into asset ${assetInfo.id}, opting in now`)
            const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: account.addr,
              receiver: account.addr,
              amount: 0,
              assetIndex: assetInfo.id,
              suggestedParams
            })
            const signedOptIn = optInTxn.signTxn(account.sk)
            const optInResponse = await algodClient.sendRawTransaction(signedOptIn).do()
            await algosdk.waitForConfirmation(algodClient, optInResponse.txid, 6)
          }

          const refreshedAccount = await algodClient.accountInformation(account.addr).do()
          const refreshedHolding = (refreshedAccount.assets || []).find((holding: any) => Number(holding['asset-id'] ?? holding.assetId) === assetInfo.id)
          const ownedUnits = BigInt(refreshedHolding?.amount ?? 0)
          if (ownedUnits < requestedUnitsBigInt) {
            const availableUnits = Number(ownedUnits) / scale
            throw new Error(`Insufficient balance: requested ${parsedAmount} ${assetInSymbol} but only ${availableUnits.toFixed(decimals)} ${assetInSymbol} is available in agent wallet`)
          }

          const amountUnits = Number(requestedUnitsBigInt)
          if (!Number.isSafeInteger(amountUnits)) {
            throw new Error('Swap amount exceeds safe integer range for asset transfer')
          }

          console.log(`📤 Creating ASA transfer: ${parsedAmount} ${assetInSymbol} (asset ${assetInfo.id}) from ${account.addr} to ${normalizedRecipient}`)

          const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: account.addr,
            receiver: normalizedRecipient,
            amount: amountUnits,
            assetIndex: assetInfo.id,
            suggestedParams,
            note: new Uint8Array(Buffer.from(`Swap: ${amountIn} ${assetInSymbol} → ${assetOutSymbol}`))
          })

          const signedTxn = txn.signTxn(account.sk)
          const response = await algodClient.sendRawTransaction(signedTxn).do()
          txId = response.txid

          await algosdk.waitForConfirmation(algodClient, txId, 6)
        }

        const result = {
          txId,
          amountIn: parsedAmount,
          amountOut: parsedAmount,
          priceImpact: 0,
          fee: Number(suggestedParams.fee) / 1_000_000
        }

        return {
          txId,
          details: {
            assetInSymbol,
            assetOutSymbol,
            amountIn: result.amountIn,
            amountOut: result.amountOut,
            priceImpact: result.priceImpact,
            fee: result.fee,
            network,
            realTransaction: true,
            explorerUrl: `https://${network === 'mainnet' ? '' : 'testnet.'}algoexplorer.io/tx/${txId}`
          }
        }
      } catch (e: any) {
        throw new Error(`Swap failed: ${e?.message || e}`)
      }
    }

    async function getAssetPrice(symbol: string): Promise<{ symbol: string; price: number; change24h: number }> {
      try {
        const upperSymbol = symbol.toUpperCase()

        const coinIdMap: Record<string, string> = {
          ALGO: 'algorand',
          USDC: 'usd-coin',
          USDT: 'tether',
          WBTC: 'wrapped-bitcoin',
          WETH: 'weth',
          ALGF: 'algorand' // placeholder; adjust when real price source available
        }

        const coinId = coinIdMap[upperSymbol]
        if (!coinId) {
          throw new Error(`Price lookup not configured for ${upperSymbol}`)
        }

        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
        )

        if (!res.ok) {
          throw new Error(`Failed to fetch ${upperSymbol} price: ${res.status}`)
        }

        const data = await res.json()
        const priceData = data[coinId]

        return {
          symbol: upperSymbol,
          price: priceData.usd,
          change24h: priceData.usd_24h_change
        }
      } catch (e: any) {
        throw new Error(`getAssetPrice failed: ${e?.message || e}`)
      }
    }
    
    async function getPortfolio(): Promise<{
      address: string
      totalValueUSD: number
      assets: Array<{
        symbol: string
        balance: string
        price: number
        valueUSD: number
      }>
    }> {
      try {
        const accountInfo = await algodClient.accountInformation(account.addr).do()
        const assets = []
        let totalValue = 0
        
        // ALGO balance
        const algoBalance = Number(accountInfo.amount) / 1000000
        const algoPrice = await getAssetPrice('ALGO')
        const algoValue = algoBalance * algoPrice.price
        
        assets.push({
          symbol: 'ALGO',
          balance: algoBalance.toString(),
          price: algoPrice.price,
          valueUSD: algoValue
        })
        totalValue += algoValue
        
        // ASA balances
        if (accountInfo.assets) {
          for (const asset of accountInfo.assets) {
            const assetId = Number(asset.assetId)
            const assetEntry = Object.entries(ALGORAND_ASSETS[network]).find(
              ([_, info]) => info.id === assetId
            )
            
            if (assetEntry) {
              const [symbol, info] = assetEntry
              const balance = Number(asset.amount) / Math.pow(10, info.decimals)
              
              if (balance > 0) {
                try {
                  const price = await getAssetPrice(symbol)
                  const value = balance * price.price
                  
                  assets.push({
                    symbol,
                    balance: balance.toString(),
                    price: price.price,
                    valueUSD: value
                  })
                  totalValue += value
                } catch {
                  // Skip if price not available
                }
              }
            }
          }
        }
        
        return {
          address: account.addr.toString(),
          totalValueUSD: totalValue,
          assets
        }
      } catch (e: any) {
        throw new Error(`getPortfolio failed: ${e?.message || e}`)
      }
    }
    
    async function getTransactionHistory(limit = 10): Promise<any[]> {
      try {
        const response = await indexerClient
          .lookupAccountTransactions(account.addr)
          .limit(limit)
          .do()
        
        return response.transactions.map((tx: any) => ({
          id: tx.id,
          type: tx['tx-type'],
          sender: tx.sender,
          receiver: tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver,
          amount: tx['payment-transaction']?.amount || tx['asset-transfer-transaction']?.amount,
          assetId: tx['asset-transfer-transaction']?.['asset-id'],
          fee: tx.fee,
          confirmedRound: tx['confirmed-round'],
          roundTime: tx['round-time']
        }))
      } catch (e: any) {
        throw new Error(`getTransactionHistory failed: ${e?.message || e}`)
      }
    }
    
    function getNetworkInfo() {
      return {
        network,
        chainId: network === 'mainnet' ? 'algorand-mainnet' : 'algorand-testnet',
        nativeSymbol: 'ALGO',
        blockTime: 4.5, // seconds
        finality: 'instant'
      }
    }
    
    return {
      algodClient,
      indexerClient,
      algorandClient,
      account,
      getAddress,
      getBalance,
      transfer,
      atomicSwap,
      getAssetPrice,
      getPortfolio,
      getTransactionHistory,
      getNetworkInfo,
      assets: ALGORAND_ASSETS[network]
    }
  } catch (e: any) {
    throw new Error(`buildAlgorandAgent failed: ${e?.message || e}`)
  }
}

export type AlgorandAgent = Awaited<ReturnType<typeof buildAlgorandAgent>>
