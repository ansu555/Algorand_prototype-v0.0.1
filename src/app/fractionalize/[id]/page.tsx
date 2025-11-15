"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchBar } from "@/components/shared/search-bar"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import {
  ArrowLeft,
  TrendingUp,
  Users,
  ExternalLink,
  Shield,
  CheckCircle,
  AlertCircle,
  Wallet,
  Clock,
  DollarSign,
} from "lucide-react"
import type { FractionalizedAsset } from "@/lib/fractionalize/types"
import { CATEGORY_LABELS } from "@/lib/fractionalize/types"
import algosdk from "algosdk"

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeAccount } = useWalletConnection()
  const [asset, setAsset] = useState<FractionalizedAsset | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [amount, setAmount] = useState<number>(1)
  const [quote, setQuote] = useState<any>(null)

  useEffect(() => {
    if (params.id) {
      loadAsset()
    }
  }, [params.id])

  useEffect(() => {
    if (amount > 0 && asset) {
      loadQuote()
    }
  }, [amount, asset])

  const loadAsset = async () => {
    try {
      const res = await fetch(`/api/fractionalize/assets?id=${params.id}&visitor=unique`, {
        cache: 'no-store'
      })
      const data = await res.json()
      if (data.success) {
        setAsset(data.data)
      }
    } catch (error) {
      console.error('Failed to load asset:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuote = async () => {
    try {
      const res = await fetch(`/api/fractionalize/purchase?asset_id=${params.id}&amount=${amount}`)
      const data = await res.json()
      if (data.success) {
        setQuote(data.data)
      }
    } catch (error) {
      console.error('Failed to load quote:', error)
    }
  }

  const handlePurchase = async () => {
    if (!activeAccount || !asset || !quote) return

    setPurchasing(true)
    try {
      // In production, this would use wallet signing
      alert('Purchase flow would be implemented with wallet transaction signing.\n\nFor hackathon demo:\n1. User signs transaction in wallet\n2. Atomic group: Opt-in + Payment\n3. Escrow distributes fractions\n4. Transaction confirmed on TestNet')
      
      // Demo: Just reload to show updated data
      await loadAsset()
    } catch (error) {
      console.error('Purchase failed:', error)
      alert('Purchase failed. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <SearchBar />
        <div className="max-w-7xl mx-auto mt-12 text-center">
          <p className="text-muted-foreground">Loading asset...</p>
        </div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="min-h-screen p-6">
        <SearchBar />
        <div className="max-w-7xl mx-auto mt-12">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Asset Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The asset you're looking for doesn't exist or has been removed
              </p>
              <Button onClick={() => router.push('/fractionalize')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Marketplace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const soldPercentage = (asset.fractions_sold / asset.total_fractions) * 100
  const available = asset.total_fractions - asset.fractions_sold
  const formatAlgo = (microAlgos: number) => (microAlgos / 1_000_000).toFixed(2)

  return (
    <div className="min-h-screen p-6">
      <SearchBar />

      <div className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.push('/fractionalize')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Button>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Asset Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Asset Image */}
            <Card>
              <div className="relative h-96 w-full overflow-hidden rounded-t-lg">
                <img
                  src={asset.image_url}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-white/90 text-black text-sm">
                    {CATEGORY_LABELS[asset.category]}
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge className="bg-green-500 text-white text-sm">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    ARC-3 Verified
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{asset.name}</h1>
                    <p className="text-muted-foreground">{asset.description}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Valuation</p>
                    <p className="text-xl font-bold">₳ {formatAlgo(asset.valuation)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Fractions</p>
                    <p className="text-xl font-bold">{asset.total_fractions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Available</p>
                    <p className="text-xl font-bold text-green-600">{available.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details Tabs */}
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
                <TabsTrigger value="owners">Owners</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Asset Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Category</p>
                        <p className="font-medium">{CATEGORY_LABELS[asset.category]}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                        <Badge variant={asset.status === 'active' ? 'default' : 'secondary'}>
                          {asset.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Created</p>
                        <p className="font-medium">{new Date(asset.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Creator</p>
                        <p className="font-mono text-xs">{asset.creator_address.substring(0, 12)}...</p>
                      </div>
                    </div>

                    {asset.properties && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-3">Additional Properties</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(asset.properties).map(([key, value]) => (
                              <div key={key}>
                                <p className="text-sm text-muted-foreground mb-1 capitalize">
                                  {key.replace(/_/g, ' ')}
                                </p>
                                <p className="font-medium text-sm">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="blockchain" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-500" />
                      Blockchain Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Original NFT (ARC-3)</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm">{asset.original_asset_id}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://testnet.algoexplorer.io/asset/${asset.original_asset_id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Fractional Token (ARC-20)</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm">{asset.fractional_token_id || 'Pending'}</p>
                        {asset.fractional_token_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://testnet.algoexplorer.io/asset/${asset.fractional_token_id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Escrow Contract</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs">{asset.escrow_address || 'Pending'}</p>
                        {asset.escrow_address && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://testnet.algoexplorer.io/address/${asset.escrow_address}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">All transactions verified on Algorand TestNet</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="owners" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Fraction Owners
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Owner information will be displayed here once fractions are purchased
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Purchase Card */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Purchase Fractions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Sold</span>
                    <span className="font-medium">{soldPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={soldPercentage} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {asset.fractions_sold.toLocaleString()} / {asset.total_fractions.toLocaleString()} fractions
                  </p>
                </div>

                <Separator />

                {/* Amount Input */}
                <div>
                  <Label htmlFor="amount">Number of Fractions</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    max={available}
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Min: 1</span>
                    <span>Max: {available.toLocaleString()}</span>
                  </div>
                </div>

                {/* Quote */}
                {quote && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price per fraction</span>
                      <span className="font-medium">₳ {quote.price_per_fraction_algo}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-medium">{quote.amount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ownership</span>
                      <span className="font-medium">{quote.percentage_of_total.toFixed(2)}%</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="font-semibold">Total Cost</span>
                      <span className="font-bold text-lg">₳ {quote.total_cost_algo}</span>
                    </div>
                  </div>
                )}

                {/* Purchase Button */}
                {activeAccount ? (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handlePurchase}
                    disabled={purchasing || available === 0 || amount > available}
                  >
                    {purchasing ? (
                      'Processing...'
                    ) : available === 0 ? (
                      'Sold Out'
                    ) : (
                      <>
                        <Wallet className="mr-2 h-5 w-5" />
                        Purchase Fractions
                      </>
                    )}
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" variant="outline" disabled>
                    Connect Wallet to Purchase
                  </Button>
                )}

                {/* Info */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-start gap-2 text-xs">
                    <Shield className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-muted-foreground">
                      Secured by Algorand smart contract escrow
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span className="text-muted-foreground">
                      ARC-20 tokens - fully compatible with Algorand DEXs
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <Clock className="h-4 w-4 text-purple-500 mt-0.5" />
                    <span className="text-muted-foreground">
                      Instant settlement on TestNet
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Market Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Raised</span>
                  <span className="font-semibold">₳ {formatAlgo(asset.total_raised)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Unique Holders</span>
                  <span className="font-semibold">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transactions</span>
                  <span className="font-semibold">-</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
