'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { formatUnits } from 'viem'
import { resolveTokenBySymbol } from '@/lib/tokens'
import { TrendingUp, TrendingDown, ArrowRight, Zap, Clock } from 'lucide-react'

export interface RouteQuote {
  routeId: string
  tokenSymbols: string[]
  poolIds?: string[]
  amountOut: string
  minOut: string
  priceImpactBps: number
  estimatedGas: number
  kind: 'DIRECT' | 'MULTI_HOP'
}

export interface QuoteResponse {
  tokenIn: string
  tokenOut: string
  amountIn: string
  slippageBps: number
  routes: RouteQuote[]
  bestRoute: RouteQuote | null
  timestamp: number
}

export interface RouteDisplayProps {
  quote: QuoteResponse | null
  isLoading?: boolean
  isExecuting?: boolean
  onRouteSelect?: (routeId: string, route: RouteQuote) => void
  selectedRouteId?: string
}

const PriceImpactIndicator: React.FC<{ impactBps: number }> = ({ impactBps }) => {
  const impactPercent = impactBps / 100
  
  // Color coding based on impact severity
  const getImpactColor = (impact: number): string => {
    if (impact < 0.5) return 'text-green-600 dark:text-green-400'
    if (impact < 1.0) return 'text-yellow-600 dark:text-yellow-400'
    if (impact < 3.0) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getImpactIcon = (impact: number) => {
    if (impact < 1.0) return <TrendingUp className="w-3 h-3" />
    return <TrendingDown className="w-3 h-3" />
  }

  return (
    <div className={`flex items-center gap-1 ${getImpactColor(impactPercent)}`}>
      {getImpactIcon(impactPercent)}
      <span className="text-xs font-medium">
        {impactPercent < 0.01 ? '<0.01%' : `${impactPercent.toFixed(2)}%`}
      </span>
    </div>
  )
}

const RoutePathDisplay: React.FC<{ tokens: string[] }> = ({ tokens }) => {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      {tokens.map((token, index) => (
        <React.Fragment key={token}>
          <span className="font-medium">{token}</span>
          {index < tokens.length - 1 && (
            <ArrowRight className="w-3 h-3 text-gray-400" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

const RouteCard: React.FC<{
  route: RouteQuote
  tokenOut: string
  amountIn: string
  isBest: boolean
  isSelected: boolean
  onSelect: () => void
}> = ({ route, tokenOut, amountIn, isBest, isSelected, onSelect }) => {
  const tokenOutInfo = resolveTokenBySymbol(tokenOut)
  const formattedAmountOut = tokenOutInfo 
    ? formatUnits(BigInt(route.amountOut), tokenOutInfo.decimals)
    : route.amountOut

  const formattedMinOut = tokenOutInfo
    ? formatUnits(BigInt(route.minOut), tokenOutInfo.decimals)
    : route.minOut

  const gasInK = Math.round(route.estimatedGas / 1000)

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'ring-2 ring-[red-600] dark:ring-[#F3C623] bg-[red-600]/5 dark:bg-[#F3C623]/5' 
          : 'hover:border-[red-600]/30 dark:hover:border-[#F3C623]/30'
      } ${isBest ? 'border-[red-600]/50 dark:border-[#F3C623]/50' : ''}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isBest && (
              <Badge variant="default" className="text-xs">
                Best Route
              </Badge>
            )}
            <Badge 
              variant={route.kind === 'DIRECT' ? 'secondary' : 'outline'} 
              className="text-xs"
            >
              {route.kind === 'DIRECT' ? 'Direct' : `${route.tokenSymbols.length - 1} Hop${route.tokenSymbols.length > 2 ? 's' : ''}`}
            </Badge>
          </div>
          <PriceImpactIndicator impactBps={route.priceImpactBps} />
        </div>

        <RoutePathDisplay tokens={route.tokenSymbols} />

        <div className="mt-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Output:</span>
            <span className="font-semibold text-[red-600] dark:text-[#F3C623]">
              {Number(formattedAmountOut).toLocaleString(undefined, { 
                maximumFractionDigits: 6 
              })} {tokenOut}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Min. received:</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Number(formattedMinOut).toLocaleString(undefined, { 
                maximumFractionDigits: 6 
              })} {tokenOut}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Zap className="w-3 h-3" />
              <span>{gasInK}k gas</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span>~{route.kind === 'DIRECT' ? '15' : '30'}s</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const RouteDisplay: React.FC<RouteDisplayProps> = ({
  quote,
  isLoading = false,
  isExecuting = false,
  onRouteSelect,
  selectedRouteId
}) => {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  // Auto-select best route if none selected
  const activeRouteId = selectedRouteId || selectedRoute || quote?.bestRoute?.routeId || null

  const handleRouteSelect = (routeId: string, route: RouteQuote) => {
    setSelectedRoute(routeId)
    onRouteSelect?.(routeId, route)
  }

  const selectedRouteData = useMemo(() => {
    if (!quote || !activeRouteId) return null
    return quote.routes.find(r => r.routeId === activeRouteId) || null
  }, [quote, activeRouteId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-[red-600] border-t-transparent rounded-full dark:border-[#F3C623]" />
            Finding best routes...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!quote) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            Enter swap details to see route options
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!quote.routes || quote.routes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            No Routes Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            No trading routes available for {quote.tokenIn} → {quote.tokenOut}. 
            This may be due to insufficient liquidity or unsupported token pair.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Route Options ({quote.routes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quote.routes.map((route, index) => (
            <RouteCard
              key={route.routeId}
              route={route}
              tokenOut={quote.tokenOut}
              amountIn={quote.amountIn}
              isBest={index === 0}
              isSelected={route.routeId === activeRouteId}
              onSelect={() => handleRouteSelect(route.routeId, route)}
            />
          ))}
        </CardContent>
      </Card>

      {selectedRouteData && onRouteSelect && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Selected Route</div>
                <RoutePathDisplay tokens={selectedRouteData.tokenSymbols} />
              </div>
              <Button 
                onClick={() => onRouteSelect(selectedRouteData.routeId, selectedRouteData)}
                disabled={isExecuting}
                className="ml-4"
              >
                {isExecuting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Executing...
                  </>
                ) : (
                  'Execute Swap'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default RouteDisplay