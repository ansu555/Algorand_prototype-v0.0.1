'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RouteDisplay, type QuoteResponse, type RouteQuote } from '@/components/shared/route-display'
import { useWalletSigner } from '@/components/providers/txnlab-wallet-provider'
import algosdk from 'algosdk'
import { parseUnits } from 'viem'
import { createMultiDexAggregator, type AggregatorQuote } from '@/lib/dex/aggregator'
import type { QuoteRequest, Asset, PoolInfo } from '@/lib/dex/types'
import { resolveTokenBySymbol } from '@/lib/tokens'

// Algorand-focused token list (testnet): ALGO and USDC

const SUPPORTED_TOKENS = ['ALGO', 'USDC']

export const SwapInterface: React.FC = () => {
  const [tokenIn, setTokenIn] = useState('ALGO')
  const [tokenOut, setTokenOut] = useState('USDC')
  const [amount, setAmount] = useState('1')
  const [slippage, setSlippage] = useState(100) // 1%
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState<string>()
  const [error, setError] = useState<string | null>(null)

  const walletSigner = useWalletSigner()

  const algodClient = useMemo(
    () => new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', ''),
    []
  )

  const aggregator = useMemo(
    () => createMultiDexAggregator(algodClient, 'testnet', { enableLogging: false }),
    [algodClient]
  )

  const buildQuoteRequest = useCallback((): {
    request: QuoteRequest
    tokenInSymbol: string
    tokenOutSymbol: string
  } => {
    if (!amount || parseFloat(amount) <= 0) {
      throw new Error('Amount must be greater than zero')
    }

    const tokenInInfo = resolveTokenBySymbol(tokenIn)
    const tokenOutInfo = resolveTokenBySymbol(tokenOut)

    if (!tokenInInfo || !tokenOutInfo) {
      throw new Error('Unsupported token selection')
    }

    const amountIn = parseUnits(amount, tokenInInfo.decimals)
    if (amountIn <= 0n) {
      throw new Error('Amount must be greater than zero')
    }

    return {
      request: {
        assetIn: tokenInInfo.address,
        assetOut: tokenOutInfo.address,
        amountIn,
        slippageTolerance: slippage,
      },
      tokenInSymbol: tokenInInfo.symbol,
      tokenOutSymbol: tokenOutInfo.symbol,
    }
  }, [amount, slippage, tokenIn, tokenOut])

  const toRouteQuote = useCallback((aggQuote: AggregatorQuote): RouteQuote => {
    const tokenSymbols = aggQuote.route.path.map((asset: Asset) =>
      asset.symbol || asset.unitName || `ASA-${asset.id}`
    )

    return {
      routeId: aggQuote.dexName,
      tokenSymbols,
      poolIds: aggQuote.route.pools.map((pool: PoolInfo) => pool.poolId),
      amountOut: aggQuote.amountOut.toString(),
      minOut: aggQuote.minimumAmountOut.toString(),
      priceImpactBps: Math.round((aggQuote.priceImpact ?? 0) * 10000),
      estimatedGas: 0,
      kind: aggQuote.route.hops > 1 ? 'MULTI_HOP' : 'DIRECT',
    }
  }, [])

  const fetchQuote = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { request, tokenInSymbol, tokenOutSymbol } = buildQuoteRequest()
  const aggQuote = await aggregator.getBestQuote(request)

      const route = toRouteQuote(aggQuote)
      const formatted: QuoteResponse = {
        tokenIn: tokenInSymbol,
        tokenOut: tokenOutSymbol,
        amountIn: amount,
        slippageBps: slippage,
        routes: [route],
        bestRoute: route,
        timestamp: Date.now(),
      }

      setQuote(formatted)
      setSelectedRouteId(route.routeId)
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch quote')
      setQuote(null)
    } finally {
      setIsLoading(false)
    }
  }, [aggregator, amount, buildQuoteRequest, slippage, toRouteQuote])

  const handleRouteSelect = useCallback((routeId: string, route: RouteQuote) => {
    setSelectedRouteId(routeId)
    console.log('Route selected:', { routeId, route })
    
    // Execute the swap with the selected route
    executeSwap(routeId, route)
  }, [])

  const executeSwap = async (_routeId: string, _route: RouteQuote) => {
    if (!walletSigner) {
      setError('Connect your wallet before executing a swap')
      return
    }

    setIsExecuting(true)
    setError(null)

    try {
      const { request } = buildQuoteRequest()
  const freshQuote = await aggregator.getBestQuote(request)

      const result = await aggregator.executeSwap(freshQuote, walletSigner)

      alert(
        `Swap executed successfully!\nTx Hash: ${result.txId}\nOutput: ${Number(result.amountOut) / 1_000_000} ${tokenOut}`
      )

      const route = toRouteQuote(freshQuote)
      const updatedQuote: QuoteResponse = {
        tokenIn,
        tokenOut,
        amountIn: amount,
        slippageBps: slippage,
        routes: [route],
        bestRoute: route,
        timestamp: Date.now(),
      }
      setQuote(updatedQuote)
      setSelectedRouteId(route.routeId)
    } catch (err: any) {
      console.error('Swap execution failed:', err)
      setError(err.message ?? 'Swap execution failed')
    } finally {
      setIsExecuting(false)
    }
  }

  const swapTokens = () => {
    const tempToken = tokenIn
    setTokenIn(tokenOut)
    setTokenOut(tempToken)
    setQuote(null)
    setSelectedRouteId(undefined)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Swap - Algorand Testnet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="token-from" className="block text-sm font-medium mb-2">From</label>
              <select 
                id="token-from"
                value={tokenIn} 
                onChange={(e) => {
                  setTokenIn(e.target.value)
                  setQuote(null)
                }}
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              >
                {SUPPORTED_TOKENS.map(token => (
                  <option key={token} value={token} disabled={token === tokenOut}>
                    {token}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="token-to" className="block text-sm font-medium mb-2">To</label>
              <select 
                id="token-to"
                value={tokenOut} 
                onChange={(e) => {
                  setTokenOut(e.target.value)
                  setQuote(null)
                }}
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              >
                {SUPPORTED_TOKENS.map(token => (
                  <option key={token} value={token} disabled={token === tokenIn}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setQuote(null)
              }}
              placeholder="0.0"
              className="w-full"
            />
          </div>

          {/* Slippage Setting */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Slippage Tolerance: {(slippage / 100).toFixed(2)}%
            </label>
            <div className="flex gap-2">
              {[50, 100, 200, 500].map(bps => (
                <Button
                  key={bps}
                  variant={slippage === bps ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSlippage(bps)}
                >
                  {(bps / 100).toFixed(1)}%
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={swapTokens} variant="outline" className="flex-1">
              ⇅ Swap
            </Button>
            <Button onClick={fetchQuote} disabled={isLoading} className="flex-2">
              {isLoading ? 'Getting Quote...' : 'Get Quote'}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Display */}
      <RouteDisplay
        quote={quote}
        isLoading={isLoading}
        isExecuting={isExecuting}
        onRouteSelect={handleRouteSelect}
        selectedRouteId={selectedRouteId}
      />

      {/* Debug Info */}
      {quote && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
              {JSON.stringify(quote, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SwapInterface