import algosdk from 'algosdk'
import { TinymanV2Client } from '@tinymanorg/tinyman-js-sdk'

const TESTNET_CONFIG = {
  server: 'https://testnet-api.algonode.cloud',
  port: 443,
  token: ''
}

export async function executeSwap(opts: {
  account: algosdk.Account
  assetInId: number
  assetOutId: number
  amountIn: string
  slippage?: number
}) {
  const { account, assetInId, assetOutId, amountIn, slippage = 0.01 } = opts
  
  try {
    // Initialize Algod client
    const algodClient = new algosdk.Algodv2(
      TESTNET_CONFIG.token,
      TESTNET_CONFIG.server,
      TESTNET_CONFIG.port
    )
    
    // Initialize Tinyman client
    const tinymanClient = new TinymanV2Client({
      algod: algodClient,
      network: 'testnet'
    })
    
    // Get pool for the asset pair
    const pool = await tinymanClient.getPool({
      assetAId: assetInId,
      assetBId: assetOutId
    })
    
    if (!pool.exists) {
      throw new Error(`Pool not found for assets ${assetInId}/${assetOutId}`)
    }
    
    // Calculate swap amount in base units
    const assetInDecimals = assetInId === 0 ? 6 : 6 // ALGO and USDC both have 6 decimals
    const amountInBaseUnits = Math.round(parseFloat(amountIn) * Math.pow(10, assetInDecimals))
    
    // Get swap quote
    const quote = await pool.getSwapQuote({
      assetIn: { id: assetInId, amount: amountInBaseUnits },
      assetOut: { id: assetOutId }
    })
    
    // Calculate minimum amount out with slippage
    const minAmountOut = Math.floor(quote.amountOut * (1 - slippage))
    
    // Prepare swap transactions
    const swapTxns = await pool.prepareSwapTransactions({
      swapType: 'fixed-input',
      assetIn: { id: assetInId, amount: amountInBaseUnits },
      assetOut: { id: assetOutId, amount: minAmountOut },
      swapper: account.addr
    })
    
    // Sign transactions
    const signedTxns = swapTxns.map(txn => txn.signTxn(account.sk))
    
    // Submit transaction group
    const { txId } = await algodClient.sendRawTransaction(signedTxns).do()
    
    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4)
    
    return {
      txId,
      amountIn: amountIn,
      amountOut: (quote.amountOut / Math.pow(10, assetInDecimals)).toString(),
      priceImpact: quote.priceImpact,
      fee: quote.fee
    }
    
  } catch (error: any) {
    throw new Error(`Swap failed: ${error.message}`)
  }
}

// Helper function for ALGO -> USDC swap
export async function swapAlgoToUsdc(account: algosdk.Account, amount: string) {
  return executeSwap({
    account,
    assetInId: 0, // ALGO
    assetOutId: 10458941, // USDC testnet
    amountIn: amount
  })
}

// Helper function for USDC -> ALGO swap  
export async function swapUsdcToAlgo(account: algosdk.Account, amount: string) {
  return executeSwap({
    account,
    assetInId: 10458941, // USDC testnet
    assetOutId: 0, // ALGO
    amountIn: amount
  })
}
