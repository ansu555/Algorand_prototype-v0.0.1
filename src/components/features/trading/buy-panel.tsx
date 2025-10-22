"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function BuyPanel() {
  // amount in fiat (USD)
  const [amount, setAmount] = useState<string>("")
  const [currency, setCurrency] = useState<string>("USD")
  const [token, setToken] = useState<{ symbol: string; name: string; image: string }>(
    { symbol: "ALGO", name: "Algorand", image: "https://cryptologos.cc/logos/algorand-algo-logo.png" }
  )

  const quickSet = (val: number) => setAmount(String(val))

  return (
    <div className="flex flex-col space-y-2">
      {/* Main amount card */}
      <div className="rounded-md border border-border bg-muted/50 p-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">buying</span>
          {/* Small dropdown */}
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
            aria-label="Amount"
          />
        </div>

        {/* Quick select */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => quickSet(100)}>$100</Button>
          <Button variant="secondary" size="sm" onClick={() => quickSet(300)}>$300</Button>
          <Button variant="secondary" size="sm" onClick={() => quickSet(1000)}>$1000</Button>
        </div>
      </div>

      {/* Selected token row */}
      <div className="rounded-md border border-border bg-muted/50 p-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Token</span>
        <div className="flex items-center gap-2">
          <span className="relative flex h-6 w-6 overflow-hidden rounded-full">
            <img src={token.image} alt={token.symbol} className="h-full w-full object-cover" />
          </span>
          <span className="font-medium">{token.symbol}</span>
        </div>
      </div>
    </div>
  )
}
