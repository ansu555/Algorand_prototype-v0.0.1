# Simple Direct Swap Implementation (No Contract Needed!)

## 🎯 Quick Solution: Direct DEX Swaps

**Good news!** You don't need to deploy your contract for single-hop swaps. We can swap directly through Tinyman DEX!

### Why This is Easier:
- ✅ No contract deployment needed
- ✅ Works immediately on testnet
- ✅ Uses existing Tinyman pools
- ✅ Your balance WILL change!

---

## 🚀 Implementation Plan

### Step 1: Create Direct Swap API

Create: `src/app/api/swap/prepare/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'
import { TinymanV2Client } from '@/lib/dex/tinyman-client'

export async function POST(request: NextRequest) {
  try {
    const {
      fromAssetId,
      toAssetId,
      amount,
      slippage,
      userAddress,
      route
    } = await request.json()

    const algodClient = getAlgodClient()
    const tinymanClient = new TinymanV2Client(algodClient, 'testnet')
    await tinymanClient.initialize()

    // Get pool info
    const pool = route.pools[0] // First pool in route
    
    // Build swap transactions
    const txns = await tinymanClient.prepareSwapTransactions({
      userAddress,
      pool,
      assetIn: fromAssetId,
      assetOut: toAssetId,
      amountIn: BigInt(amount),
      slippage: slippage * 100 // Convert to basis points
    })

    // Convert to base64 for signing
    const txnsToSign = txns.map(txn => ({
      txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64')
    }))

    return NextResponse.json({
      success: true,
      txnsToSign
    })

  } catch (error: any) {
    console.error('Prepare swap error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### Step 2: Create Submit API

Create: `src/app/api/swap/submit/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import algosdk from 'algosdk'
import { getAlgodClient } from '@/lib/algorand'

export async function POST(request: NextRequest) {
  try {
    const { signedTxns } = await request.json()
    
    const algodClient = getAlgodClient()
    
    // Convert base64 to Uint8Array
    const signedTxnBuffers = signedTxns.map((txn: string) =>
      new Uint8Array(Buffer.from(txn, 'base64'))
    )
    
    // Submit to blockchain
    const { txId } = await algodClient.sendRawTransaction(signedTxnBuffers).do()
    
    console.log('Transaction submitted:', txId)
    
    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4)
    
    console.log('Transaction confirmed in round:', confirmedTxn['confirmed-round'])
    
    return NextResponse.json({
      success: true,
      txId,
      confirmedRound: confirmedTxn['confirmed-round']
    })
    
  } catch (error: any) {
    console.error('Submit swap error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### Step 3: Update SwapCard to Use Real Swaps

Replace the `executeSwap` function in `swap-card.tsx`:

```typescript
const executeSwap = async () => {
  if (!fromToken || !toToken || !fromAmount || !activeAccount) {
    toast({
      title: "Cannot Swap",
      description: "Please connect wallet and enter amount",
      variant: "destructive"
    })
    return
  }

  if (!routeData) {
    toast({
      title: "No Route Available",
      description: "Unable to find swap route",
      variant: "destructive"
    })
    return
  }

  setIsSwapping(true)

  try {
    // Step 1: Prepare transactions
    toast({
      title: "🔄 Preparing Swap...",
      description: "Building swap transactions"
    })

    const amountInBaseUnits = parseFloat(fromAmount) * Math.pow(10, fromToken.decimals)

    const prepareRes = await fetch('/api/swap/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromAssetId: fromToken.id,
        toAssetId: toToken.id,
        amount: amountInBaseUnits,
        slippage: parseFloat(slippage),
        userAddress: activeAccount.address,
        route: routeData.route
      })
    })

    if (!prepareRes.ok) {
      throw new Error('Failed to prepare swap')
    }

    const { txnsToSign } = await prepareRes.json()

    // Step 2: Sign with wallet
    toast({
      title: "✍️ Sign Transaction",
      description: "Please approve in your wallet"
    })

    const signedTxns = await signTransactions(txnsToSign)

    // Step 3: Submit to blockchain
    toast({
      title: "📡 Submitting to Blockchain...",
      description: "Processing swap on Algorand"
    })

    const submitRes = await fetch('/api/swap/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedTxns })
    })

    if (!submitRes.ok) {
      throw new Error('Failed to submit swap')
    }

    const { txId, confirmedRound } = await submitRes.json()

    // Step 4: SUCCESS!
    toast({
      title: "✅ Swap Successful!",
      description: (
        <div className="mt-2 space-y-2 text-sm">
          <div className="font-semibold text-green-600 dark:text-green-400">
            Transaction Confirmed!
          </div>
          <div>Swapped: {fromAmount} {fromToken.unitName}</div>
          <div>Received: ~{toAmount} {toToken.unitName}</div>
          <div className="text-xs text-muted-foreground break-all">
            Round: {confirmedRound}
          </div>
          <a
            href={`https://testnet.algoexplorer.io/tx/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-xs block"
          >
            View on AlgoExplorer →
          </a>
        </div>
      ),
      duration: 10000
    })

    // Clear form
    setFromAmount('')
    setToAmount('')
    setRouteData(null)

    console.log('✅ SWAP COMPLETED!')
    console.log('TX ID:', txId)
    console.log('Round:', confirmedRound)

  } catch (error: any) {
    console.error('Swap error:', error)
    toast({
      title: "❌ Swap Failed",
      description: error.message || "Transaction failed",
      variant: "destructive",
      duration: 7000
    })
  } finally {
    setIsSwapping(false)
  }
}
```

---

## ⚠️ Important: Check Your TinymanV2Client

Your `TinymanV2Client` needs a `prepareSwapTransactions()` method. Let me check if it exists...

If it doesn't exist, you need to add it to `src/lib/dex/tinyman-client.ts`:

```typescript
async prepareSwapTransactions(params: {
  userAddress: string
  pool: any
  assetIn: number
  assetOut: number
  amountIn: bigint
  slippage: number
}): Promise<algosdk.Transaction[]> {
  const { userAddress, pool, assetIn, assetOut, amountIn, slippage } = params

  const suggestedParams = await this.algodClient.getTransactionParams().do()
  
  // Get minimum output with slippage
  const quote = await this.getQuote(pool.poolId, assetIn, assetOut, amountIn)
  const minOutput = (quote.amountOut * BigInt(10000 - slippage)) / BigInt(10000)

  const txns: algosdk.Transaction[] = []

  // Transaction 1: Asset transfer to pool
  if (assetIn === 0) {
    // ALGO payment
    txns.push(
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: userAddress,
        to: pool.poolAddress,
        amount: Number(amountIn),
        suggestedParams
      })
    )
  } else {
    // ASA transfer
    txns.push(
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: userAddress,
        to: pool.poolAddress,
        assetIndex: assetIn,
        amount: Number(amountIn),
        suggestedParams
      })
    )
  }

  // Transaction 2: App call to pool (swap method)
  const appArgs = [
    new Uint8Array(Buffer.from('swap')),
    algosdk.encodeUint64(Number(minOutput))
  ]

  txns.push(
    algosdk.makeApplicationCallTxnFromObject({
      from: userAddress,
      appIndex: pool.appId,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      appArgs,
      foreignAssets: [assetIn, assetOut].filter(id => id !== 0),
      suggestedParams
    })
  )

  // Assign group ID
  algosdk.assignGroupID(txns)

  return txns
}
```

---

## 📝 Summary

### What This Does:
1. User clicks "Swap"
2. Prepares Tinyman swap transactions
3. User signs in wallet
4. Submits to Algorand blockchain
5. **Balance actually changes!** ✨

### What You Need:
- ✅ Connected wallet with testnet ALGO
- ✅ Assets opted in
- ✅ Tinyman pools exist for your pair
- ❌ **NO contract deployment needed!**

---

## 🎯 Next Steps

1. **Implement the two API routes** (prepare & submit)
2. **Add prepareSwapTransactions to TinymanV2Client** (if missing)
3. **Update executeSwap in SwapCard**
4. **Test with small amount** (like 0.1 ALGO)
5. **Watch your balance change!** 🎉

---

## When to Use Your Custom Contract?

Use your multihop router contract for:
- Multi-hop swaps (2-3 hops)
- Advanced routing
- Custom logic
- Production optimization

For now, direct DEX swaps are simpler and faster to implement!
