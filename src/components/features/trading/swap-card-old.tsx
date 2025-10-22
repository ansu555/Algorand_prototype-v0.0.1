"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { ArrowDownUp, Settings, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SettingsModal } from "./settings-modal"

const TOKENS = [
  { symbol: 'ALGO', name: 'Algorand', logo: '🔷' },
  { symbol: 'USDC', name: 'USD Coin', logo: '💵' },
  { symbol: 'USDT', name: 'Tether', logo: '💲' },
]

export function SwapCard() {
  const { activeAccount } = useWalletConnection()
  const [fromToken, setFromToken] = useState(TOKENS[0])
  const [toToken, setToToken] = useState(TOKENS[1])
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [showSettings, setShowSettings] = useState(false)

  const isConnected = !!activeAccount

  // Swap token positions
  const handleSwapTokens = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  // Check if swap button should be disabled
  const isSwapDisabled = !fromAmount || parseFloat(fromAmount) <= 0

  return (
    <>
      <Card className="w-full shadow-lg border-2">
        <CardHeader className="space-y-1 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Swap</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      <CardContent className="space-y-3">
        {/* From Token */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <div className="relative">
            <div className="flex items-center gap-2 p-3 rounded-lg border-2 bg-muted/50 hover:bg-muted/70 transition-colors">
              <button
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background hover:bg-accent transition-colors"
              >
                <span className="text-xl">{fromToken.logo}</span>
                <div className="text-left">
                  <div className="font-semibold text-sm">{fromToken.symbol}</div>
                </div>
                <ChevronDown className="h-3 w-3" />
              </button>
              <Input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1 text-right text-xl font-semibold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            {isConnected && (
              <div className="mt-0.5 px-1 text-[10px] text-muted-foreground text-right">
                Balance: 0.00 {fromToken.symbol}
              </div>
            )}
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-1 relative z-10">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-4 border-background shadow-md hover:rotate-180 transition-transform duration-300"
            onClick={handleSwapTokens}
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <div className="relative">
            <div className="flex items-center gap-2 p-3 rounded-lg border-2 bg-muted/50 hover:bg-muted/70 transition-colors">
              <button
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background hover:bg-accent transition-colors"
              >
                <span className="text-xl">{toToken.logo}</span>
                <div className="text-left">
                  <div className="font-semibold text-sm">{toToken.symbol}</div>
                </div>
                <ChevronDown className="h-3 w-3" />
              </button>
              <Input
                type="number"
                placeholder="0.0"
                value={toAmount}
                readOnly
                className="flex-1 text-right text-xl font-semibold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 cursor-not-allowed"
              />
            </div>
            {isConnected && (
              <div className="mt-0.5 px-1 text-[10px] text-muted-foreground text-right">
                Balance: 0.00 {toToken.symbol}
              </div>
            )}
          </div>
        </div>

        {/* Exchange Rate Info */}
        {fromAmount && parseFloat(fromAmount) > 0 && (
          <div className="p-2.5 rounded-lg bg-muted/50 space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span className="font-medium">1 {fromToken.symbol} ≈ 0.00 {toToken.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Impact</span>
              <span className="font-medium text-green-600">{'<0.01%'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-medium">~0.00 {fromToken.symbol}</span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        {!isConnected ? (
          <Button
            className={cn(
              "w-full h-11 text-base font-semibold",
              "bg-primary hover:bg-primary/90 dark:bg-[#F3C623] dark:hover:bg-[#F3C623]/90",
              "dark:text-black"
            )}
            onClick={() => {
              // Wallet connect logic will be handled by the header
              console.log("Connect wallet clicked")
            }}
          >
            Connect Wallet
          </Button>
        ) : (
          <Button
            className={cn(
              "w-full h-11 text-base font-semibold",
              "bg-primary hover:bg-primary/90 dark:bg-[#F3C623] dark:hover:bg-[#F3C623]/90",
              "dark:text-black",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            disabled={isSwapDisabled}
            onClick={() => {
              console.log("Swap clicked", { fromToken, toToken, fromAmount })
            }}
          >
            {isSwapDisabled ? "Enter Amount" : "Swap"}
          </Button>
        )}

        {/* Info Notice */}
        <p className="text-[10px] text-center text-muted-foreground leading-tight">
          By trading, you agree to our Terms of Service and acknowledge that you have read our Risk Disclosure.
        </p>
      </CardContent>
    </Card>

    {/* Settings Modal */}
    <SettingsModal
      open={showSettings}
      onOpenChange={setShowSettings}
      slippage={slippage}
      onSlippageChange={setSlippage}
    />
  </>
  )
}
