"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import BackgroundPaths from "@/components/shared/animated-background"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"

const TOKENS = [
  { symbol: "ALGO", label: "ALGO" },
  { symbol: "USDC", label: "USDC" },
]

const FEE_TIERS = [
  { value: 0.0005, label: "0.05%" },
  { value: 0.003, label: "0.30%" },
  { value: 0.01, label: "1.00%" },
]

export default function CreatePoolPage() {
  const [token0, setToken0] = useState<string>("ALGO")
  const [token1, setToken1] = useState<string>("USDC")
  const [fee, setFee] = useState<number>(0.003)
  const [priceMin, setPriceMin] = useState<string>("")
  const [priceMax, setPriceMax] = useState<string>("")
  const [amount0, setAmount0] = useState<string>("")
  const [amount1, setAmount1] = useState<string>("")

  const canSubmit = useMemo(() => {
    if (!token0 || !token1 || token0 === token1) return false
    if (!amount0 && !amount1) return false
    // Optional: if either price field is filled, require both
    if ((priceMin && !priceMax) || (!priceMin && priceMax)) return false
    return true
  }, [token0, token1, amount0, amount1, priceMin, priceMax])

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create Position</h1>
              <p className="text-sm text-muted-foreground mt-1">Provide liquidity by selecting a pair, fee tier, price range, and deposit amounts.</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/pool">Back to Pools</Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pair & Fee</CardTitle>
              <CardDescription>Select token pair and fee tier for this position.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Token A</Label>
                <Select value={token0} onValueChange={setToken0}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOKENS.map((t) => (
                      <SelectItem key={t.symbol} value={t.symbol}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Token B</Label>
                <Select value={token1} onValueChange={setToken1}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOKENS.map((t) => (
                      <SelectItem key={t.symbol} value={t.symbol}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Fee Tier</Label>
                <Select value={String(fee)} onValueChange={(v) => setFee(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_TIERS.map((f) => (
                      <SelectItem key={f.value} value={String(f.value)}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Price Range (optional)</CardTitle>
              <CardDescription>Set a custom price range or leave empty for full-range.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceMin">Min Price</Label>
                <Input id="priceMin" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="e.g. 0.25" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceMax">Max Price</Label>
                <Input id="priceMax" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="e.g. 1.50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deposit Amounts</CardTitle>
              <CardDescription>Enter how much of each token you want to supply.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount0">Amount {token0}</Label>
                <Input id="amount0" value={amount0} onChange={(e) => setAmount0(e.target.value)} placeholder="0.0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount1">Amount {token1}</Label>
                <Input id="amount1" value={amount1} onChange={(e) => setAmount1(e.target.value)} placeholder="0.0" />
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between gap-3">
              <Button variant="outline" asChild>
                <Link href="/pool">Cancel</Link>
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost">Preview</Button>
                <Button disabled={!canSubmit}>Create Position</Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
