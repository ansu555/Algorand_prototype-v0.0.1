"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import BackgroundPaths from "@/components/shared/animated-background"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWalletConnection, useWalletActions } from "@/components/providers/txnlab-wallet-provider"
import { useTradeableAssets } from "@/hooks/use-tradeable-assets"

const FEE_TIERS = [
  { value: 5, label: "0.05%", bps: 5 },
  { value: 30, label: "0.30%", bps: 30 },
  { value: 100, label: "1.00%", bps: 100 },
]

// Helper to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

// Helper to convert Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export default function CreatePoolPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { activeAccount } = useWalletConnection()
  const { signTransactions } = useWalletActions()
  const { assets, loading: assetsLoading } = useTradeableAssets()

  const [token0Id, setToken0Id] = useState<number>(0) // ALGO
  const [token1Id, setToken1Id] = useState<number>(31566704) // USDC on testnet
  const [feeBps, setFeeBps] = useState<number>(30) // 0.30%
  const [priceMin, setPriceMin] = useState<string>("")
  const [priceMax, setPriceMax] = useState<string>("")
  const [amount0, setAmount0] = useState<string>("")
  const [amount1, setAmount1] = useState<string>("")
  const [step, setStep] = useState<1 | 2>(1)
  const [isCreating, setIsCreating] = useState(false)

  // Get asset info for selected tokens
  const token0Info = useMemo(() => {
    return assets.find(a => a.id === token0Id) || {
      id: 0,
      name: "Algorand",
      symbol: "ALGO",
      unitName: "ALGO",
      decimals: 6
    }
  }, [token0Id, assets])

  const token1Info = useMemo(() => {
    return assets.find(a => a.id === token1Id)
  }, [token1Id, assets])

  const canSubmit = useMemo(() => {
    if (!activeAccount) return false
    if (token0Id === token1Id) return false
    if (!amount0 || !amount1) return false
    if (Number(amount0) <= 0 || Number(amount1) <= 0) return false
    // Optional: if either price field is filled, require both
    if ((priceMin && !priceMax) || (!priceMin && priceMax)) return false
    return true
  }, [activeAccount, token0Id, token1Id, amount0, amount1, priceMin, priceMax])

  const canContinue = useMemo(() => {
    // Step 1 validation: choose two distinct tokens and a fee
    return Boolean(token0Id !== token1Id && feeBps)
  }, [token0Id, token1Id, feeBps])

  const handleCreatePool = async () => {
    if (!activeAccount) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a pool",
        variant: "destructive"
      })
      return
    }

    if (!canSubmit) {
      toast({
        title: "Invalid inputs",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)

    try {
      // Convert amounts to base units
      const amount1BaseUnits = Math.floor(Number(amount0) * Math.pow(10, token0Info.decimals))
      const amount2BaseUnits = Math.floor(Number(amount1) * Math.pow(10, token1Info?.decimals || 6))

      console.log('Creating pool with params:', {
        asset1Id: token0Id,
        asset2Id: token1Id,
        amount1: amount1BaseUnits,
        amount2: amount2BaseUnits,
        feeBps,
        userAddress: activeAccount.address
      })

      // Step 1: Prepare transactions
      const prepareRes = await fetch('/api/pool/create/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset1Id: token0Id,
          asset2Id: token1Id,
          amount1: amount1BaseUnits.toString(),
          amount2: amount2BaseUnits.toString(),
          feeBps,
          userAddress: activeAccount.address,
        })
      })

      const prepareData = await prepareRes.json()

      if (!prepareData.success) {
        throw new Error(prepareData.error || 'Failed to prepare pool creation')
      }

      console.log('Prepared', prepareData.txnCount, 'transactions')

      // Step 2: Convert base64 transactions to Uint8Array
      const txnsBytes = prepareData.txnsToSign.map((t: any) => base64ToUint8Array(t.txn))

      // Step 3: Sign with wallet
      toast({
        title: "Signing transactions",
        description: "Please approve the transaction in your wallet",
      })

      const signedTxnsBytes = await signTransactions(txnsBytes)

      // Step 4: Convert back to base64
      const signedTxnsBase64 = signedTxnsBytes.map((u8: Uint8Array) => uint8ArrayToBase64(u8))

      // Step 5: Submit to blockchain
      toast({
        title: "Submitting to blockchain",
        description: "Creating your liquidity pool...",
      })

      const submitRes = await fetch('/api/pool/create/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedTxns: signedTxnsBase64,
          ownerAddress: activeAccount.address,
          poolMetadata: {
            poolId: prepareData.poolId, // NEW: Include pool ID from multi-pool factory
            asset1Id: token0Id,
            asset2Id: token1Id,
            amount1: amount1BaseUnits.toString(),
            amount2: amount2BaseUnits.toString(),
            feeBps,
            poolAddress: prepareData.poolAddress,
            lpTokenName: prepareData.lpTokenName,
            lpTokenUnit: prepareData.lpTokenUnit,
          }
        })
      })

      const submitData = await submitRes.json()

      if (!submitData.success) {
        throw new Error(submitData.error || 'Failed to submit pool creation')
      }

      // Success!
      toast({
        title: "Pool created successfully!",
        description: `Transaction ID: ${submitData.txId.substring(0, 10)}...`,
      })

      console.log('Pool created:', submitData)

      // Redirect to pool page after a short delay
      setTimeout(() => {
        router.push('/pool')
      }, 2000)

    } catch (error: any) {
      console.error('Pool creation error:', error)
      toast({
        title: "Pool creation failed",
        description: error.message || "An error occurred while creating the pool",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

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

          {/* Wallet connection check */}
          {!activeAccount && (
            <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Please connect your wallet to create a liquidity pool.
                </p>
              </CardContent>
            </Card>
          )}

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
                      <Select value={String(token0Id)} onValueChange={(v) => setToken0Id(Number(v))} disabled={assetsLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">ALGO</SelectItem>
                          {assets.filter(a => a.id !== 0).map((asset) => (
                            <SelectItem key={asset.id} value={String(asset.id)}>
                              {asset.symbol || asset.unitName || `Asset ${asset.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Token B</Label>
                      <Select value={String(token1Id)} onValueChange={(v) => setToken1Id(Number(v))} disabled={assetsLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">ALGO</SelectItem>
                          {assets.filter(a => a.id !== 0).map((asset) => (
                            <SelectItem key={asset.id} value={String(asset.id)}>
                              {asset.symbol || asset.unitName || `Asset ${asset.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Fee tier</Label>
                      <p className="text-xs text-muted-foreground">
                        The fee earned by liquidity providers. Choose an amount that suits your risk tolerance and strategy.
                      </p>
                      <Select value={String(feeBps)} onValueChange={(v) => setFeeBps(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEE_TIERS.map((f) => (
                            <SelectItem key={f.value} value={String(f.bps)}>{f.label}</SelectItem>
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
                        <Label htmlFor="amount0">Amount {token0Info.symbol || token0Info.unitName || 'Token A'}</Label>
                        <Input
                          id="amount0"
                          type="number"
                          step="any"
                          value={amount0}
                          onChange={(e) => setAmount0(e.target.value)}
                          placeholder="0.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount1">Amount {token1Info?.symbol || token1Info?.unitName || 'Token B'}</Label>
                        <Input
                          id="amount1"
                          type="number"
                          step="any"
                          value={amount1}
                          onChange={(e) => setAmount1(e.target.value)}
                          placeholder="0.0"
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between gap-3">
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                      </div>
                      <Button
                        disabled={!canSubmit || isCreating}
                        onClick={handleCreatePool}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Position'
                        )}
                      </Button>
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
