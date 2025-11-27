"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SearchBar } from "@/components/shared/search-bar"
import {
  Rocket, ArrowLeft, ArrowRight, CheckCircle2,
  AlertTriangle, TrendingUp, Shield, Gift, Lock, Upload
} from "lucide-react"
import Link from "next/link"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { TokenPreviewCard } from "@/components/features/launchpad/create/token-preview-card"

type CurveType = 'linear' | 'exponential' | 'sigmoid'

interface FormData {
  // Step 1: Token Info
  tokenName: string
  tokenSymbol: string
  totalSupply: string
  tokensForSale: string
  description: string
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoData, setLogoData] = useState<{ data: string; mimeType: string } | null>(null)

  const [formData, setFormData] = useState<FormData>({
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '',
    tokensForSale: '',
    description: '',
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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB')
        return
      }

      setLogoFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async (): Promise<{ url: string } | null> => {
    if (!logoFile) return null

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('logo', logoFile)

      const uploadResponse = await fetch('/api/launchpad/upload', {
        method: 'POST',
        body: formDataUpload
      })

      const uploadData = await uploadResponse.json()
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload logo')
      }

      return {
        url: uploadData.logoUrl
      }
    } catch (error) {
      console.error('Logo upload error:', error)
      throw error
    }
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
      // Upload logo if provided
      let logoUrl: string | undefined = undefined
      if (logoFile) {
        const uploaded = await uploadLogo()
        if (uploaded?.url) {
          logoUrl = uploaded.url
        }
      }

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
          logoUrl: logoUrl,
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
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/launchpad" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Launchpad
            </Link>
            <h1 className="text-4xl font-bold tracking-tight">Launch Your Token</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Create a fair-launch token with bonding curve mechanics in 4 simple steps.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8 px-2">
              {[1, 2, 3, 4].map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${step >= s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                    }`}>
                    {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-sm font-medium ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {s === 1 && 'Token Info'}
                      {s === 2 && 'Bonding Curve'}
                      {s === 3 && 'Security'}
                      {s === 4 && 'Liquidity'}
                    </p>
                  </div>
                  {i < 3 && (
                    <div className={`h-0.5 flex-1 mx-4 rounded transition-colors ${step > s ? 'bg-primary' : 'bg-muted'
                      }`} />
                  )}
                </div>
              ))}
            </div>

            <Card className="border-border/50">
              <CardContent className="p-6 sm:p-8">
                {step === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">Token Information</h2>
                      <p className="text-muted-foreground">Basic details about your token project.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="tokenName">Token Name *</Label>
                        <Input
                          id="tokenName"
                          placeholder="e.g., Wavebreak Token"
                          value={formData.tokenName}
                          onChange={(e) => updateField('tokenName', e.target.value)}
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tokenSymbol">Token Symbol *</Label>
                        <Input
                          id="tokenSymbol"
                          placeholder="e.g., WAVE"
                          value={formData.tokenSymbol}
                          onChange={(e) => updateField('tokenSymbol', e.target.value.toUpperCase())}
                          className="bg-muted/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the story, purpose, vision, or vibes behind your token."
                        value={formData.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={4}
                        className="bg-muted/50 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Token Image</Label>
                        <div
                          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {logoPreview ? (
                            <div className="w-20 h-20 rounded-full overflow-hidden mb-2">
                              <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          )}
                          <p className="text-sm font-medium">Click to upload</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, WebP (Max 5MB)</p>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleLogoSelect}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="totalSupply">Total Supply *</Label>
                          <Input
                            id="totalSupply"
                            type="number"
                            placeholder="e.g., 1,000,000,000"
                            value={formData.totalSupply}
                            onChange={(e) => updateField('totalSupply', e.target.value)}
                            className="bg-muted/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tokensForSale">Tokens For Sale *</Label>
                          <Input
                            id="tokensForSale"
                            type="number"
                            placeholder="e.g., 800,000,000"
                            value={formData.tokensForSale}
                            onChange={(e) => updateField('tokensForSale', e.target.value)}
                            className="bg-muted/50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <Label>Social Links <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input
                          placeholder="Website URL"
                          value={formData.websiteUrl}
                          onChange={(e) => updateField('websiteUrl', e.target.value)}
                          className="bg-muted/50"
                        />
                        <Input
                          placeholder="Twitter URL"
                          value={formData.twitterUrl}
                          onChange={(e) => updateField('twitterUrl', e.target.value)}
                          className="bg-muted/50"
                        />
                        <Input
                          placeholder="Telegram URL"
                          value={formData.telegramUrl}
                          onChange={(e) => updateField('telegramUrl', e.target.value)}
                          className="bg-muted/50"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">Bonding Curve</h2>
                      <p className="text-muted-foreground">Configure how the token price changes as people buy.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {['linear', 'exponential', 'sigmoid'].map((type) => (
                        <div
                          key={type}
                          className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${formData.curveType === type
                            ? 'border-primary bg-primary/5'
                            : 'border-muted bg-muted/50'
                            }`}
                          onClick={() => updateField('curveType', type as CurveType)}
                        >
                          <div className="font-bold capitalize mb-1">{type}</div>
                          <div className="text-xs text-muted-foreground">
                            {type === 'linear' && 'Steady, predictable price growth.'}
                            {type === 'exponential' && 'Accelerating price growth for hype.'}
                            {type === 'sigmoid' && 'S-curve: slow start, fast middle, stable end.'}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="basePrice">Start Price (ALGO)</Label>
                        <Input
                          id="basePrice"
                          type="number"
                          step="0.000001"
                          value={formData.basePrice}
                          onChange={(e) => updateField('basePrice', e.target.value)}
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxPrice">Target Price (ALGO)</Label>
                        <Input
                          id="maxPrice"
                          type="number"
                          step="0.000001"
                          value={formData.maxPrice}
                          onChange={(e) => updateField('maxPrice', e.target.value)}
                          className="bg-muted/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bondingTarget">Bonding Target (ALGO)</Label>
                      <Input
                        id="bondingTarget"
                        type="number"
                        placeholder="e.g., 2000"
                        value={formData.bondingTarget}
                        onChange={(e) => updateField('bondingTarget', e.target.value)}
                        className="bg-muted/50"
                      />
                      <p className="text-sm text-muted-foreground">
                        Amount of ALGO to raise before graduating to DEX.
                      </p>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">Security & Rewards</h2>
                      <p className="text-muted-foreground">Protect your launch and incentivize early buyers.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="maxPurchasePerTx">Max Buy Per Tx (%)</Label>
                        <Input
                          id="maxPurchasePerTx"
                          type="number"
                          step="0.1"
                          value={formData.maxPurchasePerTx}
                          onChange={(e) => updateField('maxPurchasePerTx', e.target.value)}
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxPurchasePerUser">Max Buy Per User (%)</Label>
                        <Input
                          id="maxPurchasePerUser"
                          type="number"
                          step="0.1"
                          value={formData.maxPurchasePerUser}
                          onChange={(e) => updateField('maxPurchasePerUser', e.target.value)}
                          className="bg-muted/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="cooldownBlocks">Cooldown (Blocks)</Label>
                        <Input
                          id="cooldownBlocks"
                          type="number"
                          value={formData.cooldownBlocks}
                          onChange={(e) => updateField('cooldownBlocks', e.target.value)}
                          className="bg-muted/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="earlyBonusMultiplier">Early Buyer Bonus (x)</Label>
                        <Input
                          id="earlyBonusMultiplier"
                          type="number"
                          step="0.1"
                          value={formData.earlyBonusMultiplier}
                          onChange={(e) => updateField('earlyBonusMultiplier', e.target.value)}
                          className="bg-muted/50"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">Liquidity & Launch</h2>
                      <p className="text-muted-foreground">Finalize your launch settings.</p>
                    </div>

                    <div className="space-y-4">
                      <Label>Select DEX for Graduation</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {['tinyman', 'pact', 'folks'].map((dex) => (
                          <div
                            key={dex}
                            className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${formData.dexChoice === dex
                              ? 'border-primary bg-primary/5'
                              : 'border-muted bg-muted/50'
                              }`}
                            onClick={() => updateField('dexChoice', dex)}
                          >
                            <div className="font-bold capitalize mb-1">{dex}</div>
                            <div className="text-xs text-muted-foreground">
                              {dex === 'tinyman' && 'Standard AMM v2'}
                              {dex === 'pact' && 'Stable & Weighted Pools'}
                              {dex === 'folks' && 'Cross-chain Router'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lpLockDays">Liquidity Lock Duration (Days)</Label>
                      <Input
                        id="lpLockDays"
                        type="number"
                        value={formData.lpLockDays}
                        onChange={(e) => updateField('lpLockDays', e.target.value)}
                        className="bg-muted/50"
                      />
                      <p className="text-sm text-muted-foreground">
                        How long the liquidity will be locked after graduation.
                      </p>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      <div className="text-sm text-amber-500/90">
                        <p className="font-semibold mb-1">Ready to Launch?</p>
                        <p>Once you launch, these settings cannot be changed. Ensure all details are correct.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Actions */}
                <div className="flex items-center justify-between pt-8 mt-4 border-t border-border/50">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={step === 1}
                    className={step === 1 ? 'invisible' : ''}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>

                  {step < 4 ? (
                    <Button
                      onClick={handleNext}
                      disabled={!validateStep(step)}
                      size="lg"
                      className="px-8"
                    >
                      Next Step
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={creating || !activeAccount?.address || !validateStep(4)}
                      size="lg"
                      className="px-8 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90"
                    >
                      {creating ? 'Launching...' : (
                        <>
                          <Rocket className="h-4 w-4 mr-2" />
                          Launch Token
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="hidden lg:block">
            <TokenPreviewCard formData={{ ...formData, logoPreview }} />
          </div>
        </div>
      </div>
    </div>
  )
}
