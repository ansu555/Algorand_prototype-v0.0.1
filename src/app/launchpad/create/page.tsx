"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SearchBar } from "@/components/shared/search-bar"
import { 
  Rocket, ArrowLeft, ArrowRight, CheckCircle2, 
  AlertTriangle, TrendingUp, Shield, Gift, Lock
} from "lucide-react"
import Link from "next/link"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"

type CurveType = 'linear' | 'exponential' | 'sigmoid'

interface FormData {
  // Step 1: Token Info
  tokenName: string
  tokenSymbol: string
  totalSupply: string
  tokensForSale: string
  description: string
  logoUrl: string
  websiteUrl: string
  twitterUrl: string
  telegramUrl: string
  
  // Step 2: Bonding Curve
  curveType: CurveType
  basePrice: string
  maxPrice: string
  bondingTarget: string
  
  // Step 3: Security & Rewards
  maxPurchasePerTx: string
  maxPurchasePerUser: string
  cooldownBlocks: string
  earlyBonusMultiplier: string
  
  // Step 4: Liquidity
  dexChoice: string
  lpLockDays: string
}

export default function CreateProjectPage() {
  const router = useRouter()
  const { activeAccount } = useWalletConnection()
  const [step, setStep] = useState(1)
  const [creating, setCreating] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '',
    tokensForSale: '',
    description: '',
    logoUrl: '',
    websiteUrl: '',
    twitterUrl: '',
    telegramUrl: '',
    curveType: 'sigmoid',
    basePrice: '0.001',
    maxPrice: '0.01',
    bondingTarget: '',
    maxPurchasePerTx: '1',
    maxPurchasePerUser: '5',
    cooldownBlocks: '10',
    earlyBonusMultiplier: '3',
    dexChoice: 'tinyman',
    lpLockDays: '30',
  })

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return !!(
          formData.tokenName &&
          formData.tokenSymbol &&
          formData.totalSupply &&
          formData.tokensForSale &&
          Number(formData.tokensForSale) > 0 &&
          Number(formData.tokensForSale) <= Number(formData.totalSupply)
        )
      case 2:
        return !!(
          formData.basePrice &&
          formData.maxPrice &&
          formData.bondingTarget &&
          Number(formData.maxPrice) > Number(formData.basePrice) &&
          Number(formData.bondingTarget) > 0
        )
      case 3:
        return !!(
          formData.maxPurchasePerTx &&
          formData.maxPurchasePerUser &&
          formData.cooldownBlocks &&
          Number(formData.maxPurchasePerTx) > 0 &&
          Number(formData.maxPurchasePerUser) >= Number(formData.maxPurchasePerTx) &&
          Number(formData.cooldownBlocks) > 0
        )
      case 4:
        return !!(
          formData.lpLockDays &&
          Number(formData.lpLockDays) >= 7
        )
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!activeAccount?.address) {
      alert('Please connect your wallet')
      return
    }
    
    if (!validateStep(4)) {
      alert('Please fill in all required fields')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/launchpad/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: activeAccount.address,
          tokenName: formData.tokenName,
          tokenSymbol: formData.tokenSymbol,
          totalSupply: formData.totalSupply,
          tokensForSale: formData.tokensForSale,
          description: formData.description || undefined,
          logoUrl: formData.logoUrl || undefined,
          websiteUrl: formData.websiteUrl || undefined,
          twitterUrl: formData.twitterUrl || undefined,
          telegramUrl: formData.telegramUrl || undefined,
          curveType: formData.curveType,
          basePrice: Math.floor(Number(formData.basePrice) * 1_000_000).toString(),
          maxPrice: Math.floor(Number(formData.maxPrice) * 1_000_000).toString(),
          bondingTarget: Math.floor(Number(formData.bondingTarget) * 1_000_000).toString(),
          dexChoice: formData.dexChoice,
          lpLockDays: Number(formData.lpLockDays),
        })
      })

      const data = await res.json()

      if (data.success) {
        alert('Project created successfully!')
        router.push(`/launchpad/${data.data.id}`)
      } else {
        alert(data.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <SearchBar />
      
      <div className="max-w-4xl mx-auto mt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/launchpad">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Launchpad
              </Button>
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2 mt-4">
              <Rocket className="h-8 w-8 text-red-500" />
              Launch Your Token
            </h1>
            <p className="text-muted-foreground mt-1">
              Create a fair-launch token with bonding curve mechanics
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                    step >= s 
                      ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-semibold ${step >= s ? '' : 'text-muted-foreground'}`}>
                      {s === 1 && 'Token Info'}
                      {s === 2 && 'Bonding Curve'}
                      {s === 3 && 'Security'}
                      {s === 4 && 'Liquidity'}
                    </p>
                  </div>
                  {i < 3 && (
                    <div className={`h-1 w-full mx-2 rounded ${
                      step > s ? 'bg-gradient-to-r from-red-600 to-amber-600' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Token Information</CardTitle>
              <CardDescription>Basic details about your token</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tokenName">Token Name *</Label>
                  <Input
                    id="tokenName"
                    placeholder="e.g., My Awesome Token"
                    value={formData.tokenName}
                    onChange={(e) => updateField('tokenName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="tokenSymbol">Token Symbol *</Label>
                  <Input
                    id="tokenSymbol"
                    placeholder="e.g., MAT"
                    value={formData.tokenSymbol}
                    onChange={(e) => updateField('tokenSymbol', e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="totalSupply">Total Supply *</Label>
                  <Input
                    id="totalSupply"
                    type="number"
                    placeholder="e.g., 1000000"
                    value={formData.totalSupply}
                    onChange={(e) => updateField('totalSupply', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="tokensForSale">Tokens For Sale *</Label>
                  <Input
                    id="tokensForSale"
                    type="number"
                    placeholder="e.g., 800000"
                    value={formData.tokensForSale}
                    onChange={(e) => updateField('tokensForSale', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be ≤ total supply
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your token project..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    type="url"
                    placeholder="https://..."
                    value={formData.logoUrl}
                    onChange={(e) => updateField('logoUrl', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://..."
                    value={formData.websiteUrl}
                    onChange={(e) => updateField('websiteUrl', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="twitterUrl">Twitter URL</Label>
                  <Input
                    id="twitterUrl"
                    type="url"
                    placeholder="https://twitter.com/..."
                    value={formData.twitterUrl}
                    onChange={(e) => updateField('twitterUrl', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="telegramUrl">Telegram URL</Label>
                  <Input
                    id="telegramUrl"
                    type="url"
                    placeholder="https://t.me/..."
                    value={formData.telegramUrl}
                    onChange={(e) => updateField('telegramUrl', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Bonding Curve Configuration
              </CardTitle>
              <CardDescription>Configure price discovery mechanism</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Curve Type *</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <Button
                    variant={formData.curveType === 'linear' ? 'default' : 'outline'}
                    onClick={() => updateField('curveType', 'linear')}
                    className="h-auto py-4 flex flex-col"
                  >
                    <span className="font-bold">Linear</span>
                    <span className="text-xs text-muted-foreground">Steady growth</span>
                  </Button>
                  <Button
                    variant={formData.curveType === 'exponential' ? 'default' : 'outline'}
                    onClick={() => updateField('curveType', 'exponential')}
                    className="h-auto py-4 flex flex-col"
                  >
                    <span className="font-bold">Exponential</span>
                    <span className="text-xs text-muted-foreground">Fast growth</span>
                  </Button>
                  <Button
                    variant={formData.curveType === 'sigmoid' ? 'default' : 'outline'}
                    onClick={() => updateField('curveType', 'sigmoid')}
                    className="h-auto py-4 flex flex-col"
                  >
                    <span className="font-bold">Sigmoid</span>
                    <span className="text-xs text-muted-foreground">S-curve (default)</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="basePrice">Base Price (ALGO) *</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.000001"
                    placeholder="e.g., 0.001"
                    value={formData.basePrice}
                    onChange={(e) => updateField('basePrice', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Starting price per token
                  </p>
                </div>
                <div>
                  <Label htmlFor="maxPrice">Max Price (ALGO) *</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    step="0.000001"
                    placeholder="e.g., 0.01"
                    value={formData.maxPrice}
                    onChange={(e) => updateField('maxPrice', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Price at bonding target
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="bondingTarget">Bonding Target (ALGO) *</Label>
                <Input
                  id="bondingTarget"
                  type="number"
                  placeholder="e.g., 1000"
                  value={formData.bondingTarget}
                  onChange={(e) => updateField('bondingTarget', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ALGO needed to graduate to DEX. Recommended: 500-5000 ALGO
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-1">Price Formula:</p>
                <p className="text-xs text-muted-foreground">
                  {formData.curveType === 'linear' && 'Price = Base + (Max - Base) × Progress'}
                  {formData.curveType === 'exponential' && 'Price = Base × (Max/Base) ^ Progress'}
                  {formData.curveType === 'sigmoid' && 'Price = Base + (Max - Base) × Progress²'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Security & Rewards
              </CardTitle>
              <CardDescription>Anti-bot protection and incentives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxPurchasePerTx">Max Purchase Per Tx (%) *</Label>
                  <Input
                    id="maxPurchasePerTx"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 1"
                    value={formData.maxPurchasePerTx}
                    onChange={(e) => updateField('maxPurchasePerTx', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max % of supply per transaction (default: 1%)
                  </p>
                </div>
                <div>
                  <Label htmlFor="maxPurchasePerUser">Max Purchase Per User (%) *</Label>
                  <Input
                    id="maxPurchasePerUser"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 5"
                    value={formData.maxPurchasePerUser}
                    onChange={(e) => updateField('maxPurchasePerUser', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max % of supply per address (default: 5%)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cooldownBlocks">Cooldown Blocks *</Label>
                  <Input
                    id="cooldownBlocks"
                    type="number"
                    placeholder="e.g., 10"
                    value={formData.cooldownBlocks}
                    onChange={(e) => updateField('cooldownBlocks', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Blocks between purchases (default: 10 blocks ≈ 30 sec)
                  </p>
                </div>
                <div>
                  <Label htmlFor="earlyBonusMultiplier">Early Bonus Multiplier *</Label>
                  <Input
                    id="earlyBonusMultiplier"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 3"
                    value={formData.earlyBonusMultiplier}
                    onChange={(e) => updateField('earlyBonusMultiplier', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Points multiplier for earliest buyers (default: 3x)
                  </p>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Points Rewards System
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Early buyers get higher multipliers (3x → 1x over time)</li>
                  <li>• Points can be claimed daily after token graduation</li>
                  <li>• 30-day linear vesting schedule</li>
                  <li>• Points converted to actual tokens</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-500" />
                Liquidity & DEX Integration
              </CardTitle>
              <CardDescription>Configure graduation and LP lock</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>DEX Choice *</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <Button
                    variant={formData.dexChoice === 'tinyman' ? 'default' : 'outline'}
                    onClick={() => updateField('dexChoice', 'tinyman')}
                    className="h-auto py-4 flex flex-col"
                  >
                    <span className="font-bold">Tinyman</span>
                    <span className="text-xs text-muted-foreground">v2 AMM</span>
                  </Button>
                  <Button
                    variant={formData.dexChoice === 'pact' ? 'default' : 'outline'}
                    onClick={() => updateField('dexChoice', 'pact')}
                    className="h-auto py-4 flex flex-col"
                  >
                    <span className="font-bold">Pact</span>
                    <span className="text-xs text-muted-foreground">Stable DEX</span>
                  </Button>
                  <Button
                    variant={formData.dexChoice === 'folks' ? 'default' : 'outline'}
                    onClick={() => updateField('dexChoice', 'folks')}
                    className="h-auto py-4 flex flex-col"
                  >
                    <span className="font-bold">Folks</span>
                    <span className="text-xs text-muted-foreground">Router</span>
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="lpLockDays">LP Lock Duration (Days) *</Label>
                <Input
                  id="lpLockDays"
                  type="number"
                  placeholder="e.g., 30"
                  value={formData.lpLockDays}
                  onChange={(e) => updateField('lpLockDays', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 7 days. Recommended: 30-90 days for trust
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">Graduation Process:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Bonding target reached (e.g., {formData.bondingTarget || '1000'} ALGO)</li>
                  <li>Remaining tokens + raised ALGO sent to {formData.dexChoice === 'tinyman' ? 'Tinyman' : formData.dexChoice === 'pact' ? 'Pact' : 'Folks'}</li>
                  <li>Liquidity pool created automatically</li>
                  <li>LP tokens locked for {formData.lpLockDays || '30'} days</li>
                  <li>Points rewards activated for participants</li>
                </ol>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold mb-1">Important Notes:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Creator must fund contract with ALGO for inner transactions</li>
                      <li>• No refunds after token sale starts</li>
                      <li>• All settings are immutable after creation</li>
                      <li>• Graduation is automatic when target reached</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                {step > 1 && (
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {step < 4 ? (
                  <Button 
                    onClick={handleNext}
                    disabled={!validateStep(step)}
                    className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit}
                    disabled={creating || !activeAccount?.address || !validateStep(4)}
                    className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700"
                  >
                    {creating ? 'Creating...' : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Launch Token
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
