"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchBar } from "@/components/shared/search-bar"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import {
  ArrowLeft,
  ArrowRight,
  Image,
  Building,
  TrendingUp,
  Leaf,
  Sparkles,
  CheckCircle,
  Loader2,
} from "lucide-react"
import type { AssetCategory } from "@/lib/fractionalize/types"
import { CATEGORY_LABELS, CATEGORY_DESCRIPTIONS } from "@/lib/fractionalize/types"

export default function CreateFractionalizePage() {
  const router = useRouter()
  const { activeAccount } = useWalletConnection()
  const [step, setStep] = useState(1)
  const [creating, setCreating] = useState(false)

  // Form state
  const [category, setCategory] = useState<AssetCategory>('art')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [totalFractions, setTotalFractions] = useState(1000)
  const [fractionPrice, setFractionPrice] = useState(1)
  
  // Category-specific fields
  const [artistName, setArtistName] = useState('')
  const [yearCreated, setYearCreated] = useState('')
  const [medium, setMedium] = useState('')

  const getCategoryIcon = (cat: AssetCategory) => {
    switch (cat) {
      case 'art':
        return <Image className="h-5 w-5" />
      case 'realestate':
        return <Building className="h-5 w-5" />
      case 'vc':
        return <TrendingUp className="h-5 w-5" />
      case 'carbon':
        return <Leaf className="h-5 w-5" />
      case 'collectible':
        return <Sparkles className="h-5 w-5" />
    }
  }

  const validateStep1 = () => {
    return category && name && description && imageUrl
  }

  const validateStep2 = () => {
    return totalFractions >= 100 && totalFractions <= 1000000 && fractionPrice >= 1
  }

  const handleCreate = async () => {
    if (!activeAccount) {
      alert('Please connect your wallet')
      return
    }

    setCreating(true)
    try {
      // Build properties based on category
      const properties: any = {}
      if (category === 'art') {
        properties.artist = artistName
        properties.year_created = yearCreated
        properties.medium = medium
      }

      const response = await fetch('/api/fractionalize/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          name,
          description,
          image_url: imageUrl,
          total_fractions: totalFractions,
          fraction_price: fractionPrice * 1_000_000, // Convert ALGO to microAlgos
          properties,
          creator_mnemonic: 'DEMO_MNEMONIC', // In production, use wallet signing
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ Asset Fractionalized Successfully!\n\n` +
              `Original NFT: ${data.data.asset.original_asset_id}\n` +
              `Fractional Token: ${data.data.asset.fractional_token_id}\n` +
              `Escrow: ${data.data.escrow_address}\n\n` +
              `View on AlgoExplorer to verify on-chain!`)
        
        router.push(`/fractionalize/${data.data.asset.id}`)
      } else {
        alert(`Failed to create: ${data.error}`)
      }
    } catch (error) {
      console.error('Creation error:', error)
      alert('Failed to create fractionalization. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  if (!activeAccount) {
    return (
      <div className="min-h-screen p-6">
        <SearchBar />
        <div className="max-w-3xl mx-auto mt-12">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CheckCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                You need to connect your wallet to create a fractionalization
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

  return (
    <div className="min-h-screen p-6">
      <SearchBar />

      <div className="max-w-4xl mx-auto mt-6 space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" onClick={() => router.push('/fractionalize')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Button>
          <h1 className="text-3xl font-bold mt-4">Create Fractionalization</h1>
          <p className="text-muted-foreground mt-1">
            Fractionalize your high-value asset into tradeable tokens
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-500' : 'text-muted-foreground'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
              step >= 1 ? 'border-blue-500 bg-blue-500 text-white' : 'border-muted'
            }`}>
              {step > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
            </div>
            <span className="font-medium">Asset Details</span>
          </div>
          <div className="h-0.5 w-16 bg-muted"></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-500' : 'text-muted-foreground'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
              step >= 2 ? 'border-blue-500 bg-blue-500 text-white' : 'border-muted'
            }`}>
              {step > 2 ? <CheckCircle className="h-5 w-5" /> : '2'}
            </div>
            <span className="font-medium">Configuration</span>
          </div>
          <div className="h-0.5 w-16 bg-muted"></div>
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-500' : 'text-muted-foreground'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
              step >= 3 ? 'border-blue-500 bg-blue-500 text-white' : 'border-muted'
            }`}>
              3
            </div>
            <span className="font-medium">Review</span>
          </div>
        </div>

        {/* Step 1: Asset Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
              <CardDescription>
                Provide information about the asset you want to fractionalize
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category Selection */}
              <div>
                <Label>Asset Category</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {(['art', 'realestate', 'vc', 'carbon', 'collectible'] as AssetCategory[]).map((cat) => (
                    <Button
                      key={cat}
                      variant={category === cat ? 'default' : 'outline'}
                      className="h-auto py-4 flex-col gap-2"
                      onClick={() => setCategory(cat)}
                    >
                      {getCategoryIcon(cat)}
                      <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                      <span className="text-xs text-muted-foreground text-center">
                        {CATEGORY_DESCRIPTIONS[cat].split(' ').slice(0, 5).join(' ')}...
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Asset Name */}
              <div>
                <Label htmlFor="name">Asset Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Starry Night Masterpiece"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of the asset..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>

              {/* Image URL */}
              <div>
                <Label htmlFor="imageUrl">Image URL *</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  HTTPS or IPFS URL to the asset image
                </p>
              </div>

              {/* Category-specific fields */}
              {category === 'art' && (
                <>
                  <div>
                    <Label htmlFor="artist">Artist Name</Label>
                    <Input
                      id="artist"
                      placeholder="e.g., Vincent van Gogh"
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="year">Year Created</Label>
                      <Input
                        id="year"
                        placeholder="e.g., 1889"
                        value={yearCreated}
                        onChange={(e) => setYearCreated(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="medium">Medium</Label>
                      <Input
                        id="medium"
                        placeholder="e.g., Oil on canvas"
                        value={medium}
                        onChange={(e) => setMedium(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!validateStep1()}
                >
                  Next Step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Fractionalization Configuration</CardTitle>
              <CardDescription>
                Set the number of fractions and pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Total Fractions */}
              <div>
                <Label htmlFor="fractions">Total Number of Fractions *</Label>
                <Input
                  id="fractions"
                  type="number"
                  min={100}
                  max={1000000}
                  value={totalFractions}
                  onChange={(e) => setTotalFractions(parseInt(e.target.value) || 100)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum: 100 | Maximum: 1,000,000
                </p>
              </div>

              {/* Fraction Price */}
              <div>
                <Label htmlFor="price">Price per Fraction (ALGO) *</Label>
                <Input
                  id="price"
                  type="number"
                  min={1}
                  step={0.1}
                  value={fractionPrice}
                  onChange={(e) => setFractionPrice(parseFloat(e.target.value) || 1)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum: 1 ALGO per fraction
                </p>
              </div>

              {/* Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h3 className="font-semibold mb-2">Summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Fractions</span>
                  <span className="font-medium">{totalFractions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per Fraction</span>
                  <span className="font-medium">₳ {fractionPrice}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Valuation</span>
                    <span className="font-bold text-lg">₳ {(totalFractions * fractionPrice).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!validateStep2()}
                >
                  Next Step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Create</CardTitle>
              <CardDescription>
                Review your fractionalization details before submitting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start gap-4">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{CATEGORY_LABELS[category]}</p>
                    <p className="text-sm">{description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Fractions</p>
                    <p className="font-bold text-lg">{totalFractions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price per Fraction</p>
                    <p className="font-bold text-lg">₳ {fractionPrice}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Total Valuation</p>
                    <p className="font-bold text-2xl">₳ {(totalFractions * fractionPrice).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Important Info */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                  What happens next?
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Your asset will be minted as an ARC-3 NFT on Algorand TestNet</li>
                  <li>• A smart contract escrow will be deployed to secure the NFT</li>
                  <li>• ARC-20 fractional tokens will be created (DEX-compatible)</li>
                  <li>• Your asset will be listed on the marketplace for investors</li>
                  <li>• All transactions are verifiable on AlgoExplorer</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Create Fractionalization
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
