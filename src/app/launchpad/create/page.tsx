"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SearchBar } from "@/components/shared/search-bar"
import {
  Rocket, ArrowLeft, ArrowRight, CheckCircle2,
  AlertTriangle, TrendingUp, Shield, Gift, Lock, Upload, Info
} from "lucide-react"
import Link from "next/link"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { TokenPreviewCard } from "@/components/features/launchpad/create/token-preview-card"
import { useWallet } from "@txnlab/use-wallet-react"
import algosdk from "algosdk"
import * as blockchain from "@/lib/launchpad/blockchain"

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
  const { signTransactions } = useWallet()
  const [step, setStep] = useState(1)
  const [creating, setCreating] = useState(false)
  const [blockchainStep, setBlockchainStep] = useState('')
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

  // Wallet transaction signer wrapper to filter out nulls
  const walletSigner = async (
    txnGroup: algosdk.Transaction[],
    indexesToSign?: number[]
  ): Promise<Uint8Array[]> => {
    const signed = await signTransactions(txnGroup, indexesToSign)
    // Filter out nulls - wallet always signs all requested transactions
    return signed.filter((s): s is Uint8Array => s !== null)
  }

  // Calculate expected bonding target based on curve type
  const calculateExpectedBondingTarget = (): number | null => {
    const basePrice = Number(formData.basePrice)
    const maxPrice = Number(formData.maxPrice)
    const tokensForSale = Number(formData.tokensForSale)

    if (!basePrice || !maxPrice || !tokensForSale || basePrice >= maxPrice) {
      return null
    }

    // Calculate total ALGO needed to sell all tokens based on curve type
    // This is an approximation using integral calculus concepts
    let totalAlgo = 0

    switch (formData.curveType) {
      case 'linear':
        // For linear: Price = Base + (Max - Base) * (Sold / Supply)
        // Integral: Total = Base * Supply + (Max - Base) * Supply / 2
        totalAlgo = basePrice * tokensForSale + ((maxPrice - basePrice) * tokensForSale) / 2
        break

      case 'exponential':
        // For exponential: Price = Base * (Max / Base) ^ (Sold / Supply)
        // Approximation using average price weighted toward higher end
        const ratio = maxPrice / basePrice
        totalAlgo = (basePrice * tokensForSale * (ratio - 1)) / Math.log(ratio)
        break

      case 'sigmoid':
        // For sigmoid (quadratic): Price = Base + (Max - Base) * (Sold / Supply)²
        // Integral: Total = Base * Supply + (Max - Base) * Supply / 3
        totalAlgo = basePrice * tokensForSale + ((maxPrice - basePrice) * tokensForSale) / 3
        break
    }

    return totalAlgo
  }

  // Validate bonding target against expected value
  const getBondingTargetValidation = (): {
    isValid: boolean
    expectedTarget: number | null
    message: string
    severity: 'info' | 'warning' | 'error'
  } => {
    const expectedTarget = calculateExpectedBondingTarget()
    const bondingTarget = Number(formData.bondingTarget)

    if (!expectedTarget || !bondingTarget) {
      return {
        isValid: true,
        expectedTarget,
        message: '',
        severity: 'info'
      }
    }

    const difference = Math.abs(bondingTarget - expectedTarget)
    const percentDiff = (difference / expectedTarget) * 100

    if (bondingTarget > expectedTarget * 1.5) {
      return {
        isValid: false,
        expectedTarget,
        message: `Bonding target is too high. Based on your curve, you'll only raise ~${expectedTarget.toFixed(2)} ALGO when all tokens are sold.`,
        severity: 'error'
      }
    } else if (bondingTarget < expectedTarget * 0.3) {
      return {
        isValid: false,
        expectedTarget,
        message: `Bonding target is very low. You could raise up to ~${expectedTarget.toFixed(2)} ALGO with your current settings.`,
        severity: 'warning'
      }
    } else if (percentDiff > 20) {
      return {
        isValid: true,
        expectedTarget,
        message: `Suggested: ~${expectedTarget.toFixed(2)} ALGO based on your pricing curve.`,
        severity: 'info'
      }
    }

    return {
      isValid: true,
      expectedTarget,
      message: `Looks good! Expected range: ${(expectedTarget * 0.7).toFixed(2)} - ${(expectedTarget * 1.2).toFixed(2)} ALGO`,
      severity: 'info'
    }
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
        const validation = getBondingTargetValidation()
        return !!(
          formData.basePrice &&
          formData.maxPrice &&
          formData.bondingTarget &&
          Number(formData.maxPrice) > Number(formData.basePrice) &&
          Number(formData.bondingTarget) > 0 &&
          validation.isValid
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
    setBlockchainStep('')

    try {
      // Step 1: Upload logo if provided
      setBlockchainStep('Uploading logo...')
      let logoUrl: string | undefined = undefined
      if (logoFile) {
        const uploaded = await uploadLogo()
        if (uploaded?.url) {
          logoUrl = uploaded.url
        }
      }

      // Step 2: Create ASA on Algorand blockchain
      setBlockchainStep('Creating token on Algorand blockchain...')
      const totalSupplyMicro = BigInt(formData.totalSupply) * BigInt(1_000_000) // 6 decimals

      const asaId = await blockchain.createASA(
        {
          name: formData.tokenName,
          symbol: formData.tokenSymbol,
          total: totalSupplyMicro,
          decimals: 6,
          url: formData.websiteUrl || undefined,
          creator: activeAccount.address,
        },
        walletSigner
      )

      console.log('✅ ASA Created:', asaId)

      // Step 3: Deploy NEW contract instance for this project
      setBlockchainStep('Deploying smart contract...')

      const appId = await blockchain.deployLaunchpadContract(
        {
          creator: activeAccount.address,
        },
        walletSigner
      )

      console.log('✅ Contract Deployed! App ID:', appId)

      // Step 4: Initialize Project (Configure, Bootstrap, Fund)
      setBlockchainStep('Initializing project (Configure, Bootstrap, Fund)...')

      // Map curve type to number
      const curveTypeMap: Record<string, number> = {
        'linear': 0,
        'exponential': 1,
        'sigmoid': 2
      }

      const { configTxId, bootstrapTxId, fundingTxId } = await blockchain.initializeProject(
        {
          userAddress: activeAccount.address,
          appId: appId,  // ← Use the newly deployed contract!
          asaId: asaId,
          totalSupply: totalSupplyMicro,
          tokensForSale: BigInt(formData.tokensForSale) * BigInt(1_000_000),
          startPrice: BigInt(Math.floor(Number(formData.basePrice) * 1_000_000)),
          targetPrice: BigInt(Math.floor(Number(formData.maxPrice) * 1_000_000)),
          bondingTarget: BigInt(Math.floor(Number(formData.bondingTarget) * 1_000_000)),
          curveType: curveTypeMap[formData.curveType] || 2,
          maxBuyPerTx: BigInt(Math.floor(Number(formData.maxPurchasePerTx) * Number(formData.totalSupply) / 100)) * BigInt(1_000_000),
          maxBuyPerUser: BigInt(Math.floor(Number(formData.maxPurchasePerUser) * Number(formData.totalSupply) / 100)) * BigInt(1_000_000),
          liquidityPercent: BigInt(80), // Default 80%
          liquidityLockDays: BigInt(formData.lpLockDays),
        },
        walletSigner
      )

      console.log('✅ Project Initialized:', { configTxId, bootstrapTxId, fundingTxId })

      // Step 5: Save to database
      setBlockchainStep('Saving project details...')

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
          // Blockchain references
          asaId: asaId,
          appId: appId,  // ← Store the new contract's App ID
          configTxId: configTxId,
          bootstrapTxId: bootstrapTxId,
          fundingTxId: fundingTxId,
          status: 'active', // Mark as active since it's on blockchain
          maxBuyPerTx: (BigInt(Math.floor(Number(formData.maxPurchasePerTx) * Number(formData.totalSupply) / 100)) * BigInt(1_000_000)).toString(),
          maxBuyPerUser: (BigInt(Math.floor(Number(formData.maxPurchasePerUser) * Number(formData.totalSupply) / 100)) * BigInt(1_000_000)).toString(),
          cooldownBlocks: formData.cooldownBlocks,
        })
      })

      const data = await res.json()

      if (data.success) {
        setBlockchainStep('Complete! Redirecting...')
        alert(`✅ Token launch successful!\n\nASA ID: ${asaId}\nView on AlgoExplorer: https://testnet.algoexplorer.io/asset/${asaId}`)
        router.push(`/launchpad/${data.data.id}`)
      } else {
        throw new Error(data.error || 'Failed to save project to database')
      }
    } catch (error: any) {
      console.error('Failed to create project:', error)

      // More specific error messages
      let errorMessage = 'Failed to create project. '

      if (error.message?.includes('rejected')) {
        errorMessage += 'Transaction was rejected. Please try again.'
      } else if (error.message?.includes('insufficient')) {
        errorMessage += 'Insufficient ALGO balance. Please fund your wallet with TestNet ALGO.'
      } else if (error.message?.includes('network')) {
        errorMessage += 'Network error. Please check your connection and try again.'
      } else {
        errorMessage += error.message || 'Please try again.'
      }

      alert(errorMessage)
      setBlockchainStep('')
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

                    {/* Formula hint */}
                    <p className="text-xs text-muted-foreground/60 font-mono">
                      {formData.curveType === 'linear' && 'Formula: Price = Base + (Max - Base) * (Sold / Supply)'}
                      {formData.curveType === 'exponential' && 'Formula: Price = Base * (Max / Base) ^ (Sold / Supply)'}
                      {formData.curveType === 'sigmoid' && 'Formula: Price = Base + (Max - Base) * (Sold / Supply)²'}
                    </p>


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
                      <div className="flex items-center justify-between">
                        <Label htmlFor="bondingTarget">Bonding Target (ALGO)</Label>
                        {calculateExpectedBondingTarget() && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs"
                            onClick={() => {
                              const expected = calculateExpectedBondingTarget()
                              if (expected) {
                                updateField('bondingTarget', expected.toFixed(2))
                              }
                            }}
                          >
                            Auto-calculate
                          </Button>
                        )}
                      </div>
                      <Input
                        id="bondingTarget"
                        type="number"
                        placeholder="e.g., 2000"
                        value={formData.bondingTarget}
                        onChange={(e) => updateField('bondingTarget', e.target.value)}
                        className={`bg-muted/50 ${formData.bondingTarget && !getBondingTargetValidation().isValid
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : ''
                          }`}
                      />
                      {formData.bondingTarget && getBondingTargetValidation().message && (
                        <div
                          className={`text-xs flex items-start gap-2 p-2 rounded ${getBondingTargetValidation().severity === 'error'
                            ? 'text-red-500 bg-red-500/10'
                            : getBondingTargetValidation().severity === 'warning'
                              ? 'text-amber-500 bg-amber-500/10'
                              : 'text-blue-500 bg-blue-500/10'
                            }`}
                        >
                          {getBondingTargetValidation().severity === 'error' && (
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          )}
                          <span>{getBondingTargetValidation().message}</span>
                        </div>
                      )}
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

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Revenue Model
                      </h4>
                      <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                        <li><strong>80%</strong> of raised funds go to Liquidity Pool (Locked)</li>
                        <li><strong>1%</strong> Platform Fee (Success-based only)</li>
                        <li><strong>~19%</strong> goes to You (Creator Revenue)</li>
                      </ul>
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
                      disabled={creating || !activeAccount}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      size="lg"
                    >
                      {creating ? (
                        <>
                          <Rocket className="h-5 w-5 mr-2 animate-bounce" />
                          {blockchainStep || 'Launching...'}
                        </>
                      ) : (
                        <>
                          <Rocket className="h-5 w-5 mr-2" />
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
