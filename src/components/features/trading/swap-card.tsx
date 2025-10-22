"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { SettingsModal } from "./settings-modal"

const TOKENS = [
  { 
    symbol: 'ALGO', 
    name: 'Algorand', 
    image: 'https://cryptologos.cc/logos/algorand-algo-logo.png'
  },
  { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    image: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  { 
    symbol: 'USDT', 
    name: 'Tether', 
    image: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
]

export function SwapCard() {
  const { activeAccount } = useWalletConnection()
  const [fromToken, setFromToken] = useState(TOKENS[0])
  const [toToken, setToToken] = useState(TOKENS[1])
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<'swap' | 'limit' | 'buy' | 'sell'>('swap')

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
      <Card className="w-full rounded-xl border border-border shadow-lg bg-card">
        <CardContent className="p-3 space-y-3.5">
          {/* Tab Buttons */}
          <div className="flex items-center p-1 bg-muted/30 rounded-mid h-[42px] relative">
            {/* Background slider */}
            <div 
              className={cn(
                "absolute h-8 rounded-mid bg-background shadow-sm transition-all duration-300 ease-in-out",
                activeTab === 'swap' && "w-[72px] left-1",
                activeTab === 'limit' && "w-[72px] left-[76px]",
                activeTab === 'buy' && "w-[72px] left-[148px]",
                activeTab === 'sell' && "w-[72px] left-[220px]"
              )}
            />
            
            {/* Tab Buttons */}
            <button
              onClick={() => setActiveTab('swap')}
              className={cn(
                "relative z-10 px-0 py-2 text-sm font-medium rounded-full transition-colors duration-200 min-w-[72px] justify-center",
                activeTab === 'swap' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Swap
            </button>
            <button
              onClick={() => setActiveTab('limit')}
              className={cn(
                "relative z-10 px-0 py-2 text-sm font-medium rounded-full transition-colors duration-200 min-w-[72px] justify-center",
                activeTab === 'limit' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Limit
            </button>
            <button
              onClick={() => setActiveTab('buy')}
              className={cn(
                "relative z-10 px-0 py-2 text-sm font-medium rounded-full transition-colors duration-200 min-w-[72px] justify-center",
                activeTab === 'buy' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Buy
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              className={cn(
                "relative z-10 px-0 py-2 text-sm font-medium rounded-full transition-colors duration-200 min-w-[72px] justify-center",
                activeTab === 'sell' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sell
            </button>
          </div>

          {/* Settings Button */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-y-2">
            <div className="flex flex-col items-center -space-y-3">
              {/* Pay Token Input */}
              <div className="flex w-full gap-2 px-3 py-3 min-h-24 items-center justify-between group transition-all duration-300 bg-muted/50 rounded-lg border border-border focus-within:border-primary focus-within:bg-background h-[7.5rem]">
                <div className="space-y-2 flex flex-col grow text-muted-foreground">
                  <span className="text-sm font-medium">Pay</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="h-9 w-full bg-transparent px-0 py-0 border-0 focus-visible:outline-none focus-visible:ring-0 text-3xl placeholder:text-muted-foreground/50"
                  />
                  <span className="h-5 inline-flex items-center whitespace-nowrap text-sm">
                    ${fromAmount ? (parseFloat(fromAmount) * 100).toFixed(2) : '0.00'}
                  </span>
                </div>
                
                <div className="space-y-2 flex flex-col items-end">
                  <div className="h-5"></div>
                  <Button
                    variant="secondary"
                    className="px-2 py-1 gap-x-1.5 text-base font-medium h-auto rounded-md hover:bg-accent active:scale-[0.99] transition-all duration-300"
                  >
                    <span className="relative flex min-h-4 min-w-4 shrink-0 rounded-full h-6 w-6">
                      <img 
                        className="aspect-square h-full w-full rounded-full" 
                        src={fromToken.image}
                        alt={fromToken.symbol}
                      />
                    </span>
                    <span className="text-xl">{fromToken.symbol}</span>
                  </Button>
                  <div className="h-5"></div>
                </div>
              </div>

              {/* Swap Button */}
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 shrink-0 flex z-10 rounded-md active:scale-[0.99] transition-all duration-300"
                onClick={handleSwapTokens}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" className="h-5">
                  <path d="M14.502 16.884a.757.757 0 0 0 .776-.764V6.415l2.4 2.36a.7.7 0 0 0 .525.212q.315 0 .556-.22A.75.75 0 0 0 19 8.221a.74.74 0 0 0-.241-.544l-3.592-3.533a.9.9 0 0 0-.308-.202 1.05 1.05 0 0 0-.702 0 .84.84 0 0 0-.31.202l-3.619 3.558a.7.7 0 0 0-.228.527q.003.3.244.538.24.22.546.227a.73.73 0 0 0 .545-.229l2.39-2.35v9.715q0 .32.223.537a.76.76 0 0 0 .554.217m-9.012 0q.185 0 .353-.06a.84.84 0 0 0 .31-.2l3.619-3.559A.7.7 0 0 0 10 12.54.75.75 0 0 0 9.756 12a.82.82 0 0 0-.546-.227.73.73 0 0 0-.545.23l-2.39 2.349V4.638a.72.72 0 0 0-.223-.538.76.76 0 0 0-.554-.216.757.757 0 0 0-.776.763v9.705l-2.4-2.36a.7.7 0 0 0-.525-.211.8.8 0 0 0-.556.219.75.75 0 0 0-.241.546q0 .308.24.545l3.593 3.532q.146.143.308.202.163.06.349.059"></path>
                </svg>
              </Button>

              {/* Receive Token Input */}
              <div className="flex w-full gap-2 px-3 py-3 min-h-24 items-center justify-between group transition-all duration-300 bg-muted/50 rounded-lg border border-border focus-within:border-primary focus-within:bg-background h-[7.5rem]">
                <div className="space-y-2 flex flex-col grow text-muted-foreground">
                  <span className="text-sm font-medium">Receive</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={toAmount}
                    readOnly
                    className="h-9 w-full bg-transparent px-0 py-0 border-0 focus-visible:outline-none focus-visible:ring-0 text-3xl placeholder:text-muted-foreground/50 cursor-not-allowed"
                  />
                  <span className="h-5 inline-flex items-center whitespace-nowrap text-sm">
                    ${toAmount ? (parseFloat(toAmount) * 100).toFixed(2) : '0.00'}
                  </span>
                </div>
                
                <div className="space-y-2 flex flex-col items-end">
                  <div className="h-5"></div>
                  <Button
                    variant="secondary"
                    className="px-2 py-1 gap-x-1.5 text-base font-medium h-auto rounded-md hover:bg-accent active:scale-[0.99] transition-all duration-300"
                  >
                    <span className="relative flex min-h-4 min-w-4 shrink-0 rounded-full h-6 w-6">
                      <img 
                        className="aspect-square h-full w-full rounded-full" 
                        src={toToken.image}
                        alt={toToken.symbol}
                      />
                    </span>
                    <span className="text-xl">{toToken.symbol}</span>
                  </Button>
                  <div className="h-5"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Connect Wallet / Swap Button */}
          <div className="flex flex-col items-center space-y-3.5">
            {!isConnected ? (
              <Button
                className={cn(
                  "w-full h-11 text-base font-semibold rounded-md px-4 py-2.5 active:scale-[0.99] transition-all duration-300",
                  "bg-primary hover:bg-primary/90 dark:bg-[#F3C623] dark:hover:bg-[#F3C623]/90",
                  "dark:text-black"
                )}
                onClick={() => {
                  console.log("Connect wallet clicked")
                }}
              >
                Connect Wallet
              </Button>
            ) : (
              <Button
                className={cn(
                  "w-full h-11 text-base font-semibold rounded-md px-4 py-2.5 active:scale-[0.99] transition-all duration-300",
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
          </div>
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
