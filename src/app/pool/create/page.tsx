"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import BackgroundPaths from "@/components/shared/animated-background"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { CheckCircle2, Circle } from "lucide-react"

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
  const [step, setStep] = useState<1 | 2>(1)

  const canSubmit = useMemo(() => {
    if (!token0 || !token1 || token0 === token1) return false
    if (!amount0 && !amount1) return false
    // Optional: if either price field is filled, require both
    if ((priceMin && !priceMax) || (!priceMin && priceMax)) return false
    return true
  }, [token0, token1, amount0, amount1, priceMin, priceMax])

  const canContinue = useMemo(() => {
    // Step 1 validation: choose two distinct tokens and a fee
    return Boolean(token0 && token1 && token0 !== token1 && fee)
  }, [token0, token1, fee])

  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create Position</h1>
              <p className="text-sm text-muted-foreground mt-1">Provide liquidity in two simple steps.</p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/pool">Back to Pools</Link>
            </Button>
          </div>

          {/* Two-column layout */}
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Steps sidebar */}
            <aside className="md:sticky md:top-24 md:w-[360px] w-full self-start">
              <Card className="p-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">2 Steps</CardTitle>
                  <CardDescription>Follow the steps to create your position.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <StepRow
                    active={step === 1}
                    completed={step > 1}
                    title="Step 1"
                    subtitle="Select token pair and fees"
                    onClick={() => setStep(1)}
                  />
                  <div className="h-2" />
                  <StepRow
                    active={step === 2}
                    completed={false}
                    title="Step 2"
                    subtitle="Set price range and deposit amounts"
                    onClick={() => step > 1 && setStep(2)}
                  />
                </CardContent>
              </Card>
            </aside>

            {/* Main content */}
            <section className="flex-1 space-y-6">
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Step 1: Select pair and fees</CardTitle>
                    <CardDescription>Choose the tokens you want to provide and the fee tier.</CardDescription>
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
                      <Label>Fee tier</Label>
                      <p className="text-xs text-muted-foreground">
                        The amount earned providing liquidity. Choose an amount that suits your risk tolerance and strategy.
                      </p>
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
                  <CardFooter className="flex items-center justify-between gap-3">
                    <Button variant="outline" asChild>
                      <Link href="/pool">Cancel</Link>
                    </Button>
                    <Button disabled={!canContinue} onClick={() => setStep(2)}>Continue</Button>
                  </CardFooter>
                </Card>
              )}

              {step === 2 && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Step 2: Price Range (optional)</CardTitle>
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
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                        <Button variant="ghost">Preview</Button>
                      </div>
                      <Button disabled={!canSubmit}>Create Position</Button>
                    </CardFooter>
                  </Card>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

function StepRow({ active, completed, title, subtitle, onClick }: { active: boolean; completed: boolean; title: string; subtitle: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border bg-white/70 dark:bg-[#171717]/70 transition-colors ${
        active
          ? "border-red-600/40 dark:border-[#F3C623]/40"
          : "border-gray-200/40 dark:border-[#F3C623]/10 hover:border-gray-300/60 dark:hover:border-[#F3C623]/20"
      } p-4 flex items-start gap-3`}
    >
      <div className="mt-0.5">
        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-red-600 dark:text-[#F3C623]" />
        ) : (
          <Circle className={active ? "h-5 w-5 text-red-600 dark:text-[#F3C623]" : "h-5 w-5 text-gray-400"} />
        )}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </button>
  )
}
