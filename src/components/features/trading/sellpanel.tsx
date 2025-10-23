"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"

export function SellPanel() {
  const { isConnected } = useWalletConnection()

  // amount in token units (e.g., ALGO)
  const [amount, setAmount] = useState<string>("")
  const [currency, setCurrency] = useState<string>("USD") // receiving currency
  const [token] = useState<{ symbol: string; name: string; image: string }>(
    { symbol: "ALGO", name: "Algorand", image: "https://cryptologos.cc/logos/algorand-algo-logo.png" }
  )

  const quickSet = (val: number) => setAmount(String(val))
  const amountValid = !!amount && !isNaN(Number(amount)) && Number(amount) > 0

  return (
    <div className="flex flex-col space-y-2">
      {/* Main amount card */}
      <div className="rounded-md border border-border bg-muted/50 p-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">selling</span>
          {/* Small dropdown for receive currency */}
          <select
            aria-label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        {/* Amount input (big, centered) */}
        <div className="py-4">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="$0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-auto w-full bg-transparent border-0 text-center text-4xl font-semibold focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
            aria-label="Token amount"
          />
        </div>

        {/* Quick select (token amounts) */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => quickSet(10)}>$10</Button>
          <Button variant="secondary" size="sm" onClick={() => quickSet(50)}>$50</Button>
          <Button variant="secondary" size="sm" onClick={() => quickSet(100)}>$100</Button>
        </div>
      </div>

      {/* Selected token row */}
      <div className="rounded-md border border-border bg-muted/50 p-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Token</span>
        {/* Placeholder dropdown for token selection (to be populated by backend) */}
        <select
          className="h-9 min-w-[90px] rounded-md border border-border bg-background px-2 text-sm focus:outline-none"
          aria-label="Select token"
          disabled
        />
      </div>

      {/* Action button */}
      <Button
        className="w-full h-11 text-base font-semibold rounded-md px-4 py-2.5 active:scale-[0.99] transition-all duration-300 bg-primary hover:bg-primary/90 dark:bg-[#F3C623] dark:hover:bg-[#F3C623]/90 dark:text-black disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isConnected && !amountValid}
        onClick={() => {
          if (!isConnected) {
            console.log("Connect wallet clicked")
            return
          }
          if (amountValid) {
            console.log("Sell clicked", { amount, token, currency })
          }
        }}
      >
        {!isConnected ? "Connect Wallet" : !amountValid ? "Enter Amount" : "Sell"}
      </Button>
    </div>
  )
}
