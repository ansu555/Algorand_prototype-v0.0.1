"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { cn } from "@/lib/utils"

export function LimitPanel() {
  const { activeAccount } = useWalletConnection()
  const isConnected = !!activeAccount

  const [fromAmount, setFromAmount] = useState("")
  // Default to a sensible placeholder price; user can edit anytime
  const [price, setPrice] = useState("1.00")
  const [toAmount, setToAmount] = useState("")
  // Quick option state for percentage adjustment
  const [quickOption, setQuickOption] = useState<"market" | "1" | "2" | "5" | "custom">("market")
  const [customPercent, setCustomPercent] = useState<string>("")
  // Expiry selection state
  const [expiry, setExpiry] = useState<"1d" | "1w" | "1m" | "1y">("1d")

  const isActionDisabled = !fromAmount || parseFloat(fromAmount) <= 0 || !price || parseFloat(price) <= 0

  return (
    <div className="flex flex-col gap-y-2">
  <div className="flex flex-col items-center space-y-2">
        {/* Limit (first) */}
        <div className="flex w-full gap-2 px-3 py-3 min-h-24 items-center justify-between group transition-all duration-300 bg-muted/50 rounded-lg border border-border focus-within:border-primary focus-within:bg-background h-[8.5rem]">
          <div className="space-y-2 flex flex-col grow text-muted-foreground">
            <span className="text-sm font-medium">Limit</span>
            <div className="flex items-center justify-between gap-2">
              <Input
                type="number"
                placeholder="Current price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-9 w-full bg-transparent px-0 py-0 border-0 focus-visible:outline-none focus-visible:ring-0 text-3xl placeholder:text-muted-foreground/50"
              />
            </div>
            {/* Bottom row: quick options (left) + custom percent (right) */}
            <div className="mt-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(["market", "1", "2", "5"] as const).map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    variant={quickOption === opt ? "default" : "secondary"}
                    className={cn(
                      "h-7 px-2 rounded-md text-xs font-medium",
                      quickOption === opt
                        ? "bg-primary text-primary-foreground dark:bg-[#F3C623] dark:text-black"
                        : "bg-secondary/70 hover:bg-secondary"
                    )}
                    onClick={() => setQuickOption(opt)}
                  >
                    {opt === "market" ? "market" : `${opt}%`}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                
              </div>
            </div>
          </div>
          <div className="space-y-2 flex flex-col items-end">
            <div className="h-5"></div>
            {/* <div className="px-2 py-1 text-base font-medium rounded-md bg-secondary">USDC per ALGO</div> */}
            <div className="h-5"></div>
          </div>
        </div>

        {/* Pay */}
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
            {/* Placeholder dropdown for token selection */}
            <select
              className="h-9 min-w-[90px] rounded-md border border-border bg-background px-2 text-sm focus:outline-none"
              aria-label="Select token"
              disabled
            />
            <div className="h-5"></div>
          </div>
        </div>

        {/* Receive */}
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
            {/* Placeholder dropdown for token selection */}
            <select
              className="h-9 min-w-[90px] rounded-md border border-border bg-background px-2 text-sm focus:outline-none"
              aria-label="Select token"
              disabled
            />
            <div className="h-5"></div>
          </div>
        </div>

        {/* Expiry row */}
        <div className="flex w-full items-center justify-between rounded-lg bg-muted/30 border border-border px-3 py-2">
          <span className="text-sm text-muted-foreground">Expiry</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={expiry === "1d" ? "default" : "secondary"}
              className={cn(
                "h-7 px-2 rounded-md text-xs font-medium",
                expiry === "1d"
                  ? "bg-primary text-primary-foreground dark:bg-[#F3C623] dark:text-black"
                  : "bg-secondary/70 hover:bg-secondary"
              )}
              onClick={() => setExpiry("1d")}
            >
              1 day
            </Button>
            <Button
              type="button"
              variant={expiry === "1w" ? "default" : "secondary"}
              className={cn(
                "h-7 px-2 rounded-md text-xs font-medium",
                expiry === "1w"
                  ? "bg-primary text-primary-foreground dark:bg-[#F3C623] dark:text-black"
                  : "bg-secondary/70 hover:bg-secondary"
              )}
              onClick={() => setExpiry("1w")}
            >
              1 week
            </Button>
            <Button
              type="button"
              variant={expiry === "1m" ? "default" : "secondary"}
              className={cn(
                "h-7 px-2 rounded-md text-xs font-medium",
                expiry === "1m"
                  ? "bg-primary text-primary-foreground dark:bg-[#F3C623] dark:text-black"
                  : "bg-secondary/70 hover:bg-secondary"
              )}
              onClick={() => setExpiry("1m")}
            >
              1 month
            </Button>
            <Button
              type="button"
              variant={expiry === "1y" ? "default" : "secondary"}
              className={cn(
                "h-7 px-2 rounded-md text-xs font-medium",
                expiry === "1y"
                  ? "bg-primary text-primary-foreground dark:bg-[#F3C623] dark:text-black"
                  : "bg-secondary/70 hover:bg-secondary"
              )}
              onClick={() => setExpiry("1y")}
            >
              1 year
            </Button>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {!isConnected ? (
        <Button
          className={cn(
            "w-full h-11 text-base font-semibold rounded-md px-4 py-2.5 active:scale-[0.99] transition-all duration-300",
            "bg-primary hover:bg-primary/90 dark:bg-[#F3C623] dark:hover:bg-[#F3C623]/90",
            "dark:text-black"
          )}
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
          disabled={isActionDisabled}
        >
          {isActionDisabled ? "Enter Amount & Price" : "Place Limit Order"}
        </Button>
      )}
    </div>
  )
}
