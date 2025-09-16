'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { RouteDisplay, type QuoteResponse, type RouteQuote } from './route-display'
import { resolveTokenBySymbol } from '@/lib/tokens'
import { getAmountsOut } from '@/lib/amm/routerClient'
import { getAmmAddresses } from '@/lib/amm/config'

import { FUJI_SYMBOL_TO_TOKEN } from '@/lib/tokens'

// Build supported tokens list dynamically from registry
const SUPPORTED_TOKENS = React.useMemo(() => {
  const base = ['WAVAX', 'USDC', 'WETH.e', 'USDT.e']
  const custom = Object.keys(FUJI_SYMBOL_TO_TOKEN).filter(s => ['TKA','TKB','TKC'].includes(s))
  return [...base, ...custom]
}, [])

export const SwapInterface: React.FC = () => {
  const [tokenIn, setTokenIn] = useState('WAVAX')
  const [tokenOut, setTokenOut] = useState('USDC')
  const [amount, setAmount] = useState('1')
  const [slippage, setSlippage] = useState(100) // 1%
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState<string>()
  const [error, setError] = useState<string | null>(null)

  const fetchQuote = useCallback(async () => {
    if (!tokenIn || !tokenOut || !amount || parseFloat(amount) <= 0) return

    setIsLoading(true)
    setError(null)
    try {
      // Try client-side on-chain direct quote first for faster feedback
      const tIn = resolveTokenBySymbol(tokenIn)
      const tOut = resolveTokenBySymbol(tokenOut)
      const routerAddr = getAmmAddresses().router
      if (tIn && tOut && tIn.address !== 'AVAX' && tOut.address !== 'AVAX' && routerAddr) {
        try {
          const onchain = await getAmountsOut(amount, [tIn.address as string, tOut.address as string])
          const route = {
            routeId: 'ONCHAIN:direct',
            tokenSymbols: [tIn.symbol, tOut.symbol],
            poolIds: [],
            amountOut: onchain.amounts[onchain.amounts.length - 1].toString(),
            minOut: onchain.amounts[onchain.amounts.length - 1].toString(),
            priceImpactBps: null,
            estimatedGas: 100000,
            kind: 'DIRECT' as const
          }
          const payload = {
            tokenIn,
            tokenOut,
            amountIn: amount,
            slippageBps: slippage,
            routes: [route],
            bestRoute: route,
            timestamp: Date.now()
          }
          setQuote(payload as unknown as QuoteResponse)
          setSelectedRouteId(undefined)
          setIsLoading(false)
          return
        } catch (e) {
          // fallthrough to server quote
          console.debug('On-chain quote failed, falling back to API', e)
        }
      }

      // Fallback: server-side quote (may combine local & on-chain logic)
      const response = await fetch('/api/swap/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenIn,
          tokenOut,
          amount,
          slippage,
          maxRoutes: 5
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch quote')
      }

      setQuote(data)
      setSelectedRouteId(undefined) // Reset selection
    } catch (err: any) {
      setError(err.message)
      setQuote(null)
    } finally {
      setIsLoading(false)
    }
  }, [tokenIn, tokenOut, amount, slippage])

  const handleRouteSelect = useCallback((routeId: string, route: RouteQuote) => {
    setSelectedRouteId(routeId)
    console.log('Route selected:', { routeId, route })
    
    // Execute the swap with the selected route
    executeSwap(routeId, route)
  }, [])

  const executeSwap = async (routeId: string, route: RouteQuote) => {
    if (!tokenIn || !tokenOut || !amount || parseFloat(amount) <= 0) {
      setError('Invalid swap parameters')
      return
    }

    setIsExecuting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenIn,
          tokenOut,
          amount,
          slippage,
          routeId,
          wait: true // Wait for transaction confirmation
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Swap execution failed')
      }

      // Show success message
      alert(`Swap executed successfully!\nTx Hash: ${data.txHash}\nOutput: ${route.amountOut} ${tokenOut}`)
      
      // Reset form
      setAmount('1')
      setQuote(null)
      setSelectedRouteId(undefined)
      
    } catch (err: any) {
      setError(err.message)
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
          <CardTitle>Custom Swap - Avalanche Fuji</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">From</label>
              <select 
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
              <label className="block text-sm font-medium mb-2">To</label>
              <select 
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