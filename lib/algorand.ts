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
    USDC: { id: 10458941, symbol: 'USDC', decimals: 6, name: 'USD Coin (Test)' }
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
        
        // ASA balance
        const asset = accountInfo.assets?.find((a: any) => a['asset-id'] === assetId)
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
        const suggestedParams = await algodClient.getTransactionParams().do()
        
        let txn: algosdk.Transaction
        
        if (!assetId || assetId === 0) {
          // ALGO transfer
          const amountMicroAlgos = Math.round(parseFloat(amount) * 1000000)
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
          
          const amountUnits = Math.round(parseFloat(amount) * Math.pow(10, assetInfo.decimals))
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
        
        return {
          txId,
          details: {
            from: account.addr,
            to,
            amount,
            assetId,
            note,
            network
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
    }): Promise<{ txId: string; details: any }> {
      try {
        const { assetInSymbol, assetOutSymbol, amountIn } = opts
        
        // Import simple swap functions
        const { swapAlgoToUsdc, swapUsdcToAlgo } = await import('./simple-swap')
        
        let result
        
        // Handle supported swap pairs
        if (assetInSymbol.toLowerCase() === 'algo' && assetOutSymbol.toLowerCase() === 'usdc') {
          result = await swapAlgoToUsdc(account, amountIn, algodClient, network)
        } else if (assetInSymbol.toLowerCase() === 'usdc' && assetOutSymbol.toLowerCase() === 'algo') {
          result = await swapUsdcToAlgo(account, amountIn, algodClient, network)
        } else {
          throw new Error(`Swap pair ${assetInSymbol}/${assetOutSymbol} not supported yet. Only ALGO/USDC available.`)
        }
        
        return {
          txId: result.txId,
          details: {
            assetInSymbol,
            assetOutSymbol,
            amountIn: result.amountIn,
            amountOut: result.amountOut,
            priceImpact: result.priceImpact,
            fee: result.fee,
            network
          }
        }
      } catch (e: any) {
        throw new Error(`Swap failed: ${e?.message || e}`)
      }
    }
    
    async function getAssetPrice(symbol: string): Promise<{ symbol: string; price: number; change24h?: number }> {
      try {
        // Use CoinGecko for price data
        const coinGeckoIds: Record<string, string> = {
          ALGO: 'algorand',
          USDC: 'usd-coin',
          USDT: 'tether',
          WBTC: 'wrapped-bitcoin',
          WETH: 'weth'
        }
        
        const coinId = coinGeckoIds[symbol.toUpperCase()]
        if (!coinId) throw new Error(`Price not available for ${symbol}`)
        
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
        )
        
        if (!res.ok) throw new Error(`Failed to fetch ${symbol} price: ${res.status}`)
        
        const data = await res.json()
        const priceData = data[coinId]
        
        return {
          symbol: symbol.toUpperCase(),
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
