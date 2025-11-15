"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Upload, ArrowLeft, Rocket } from "lucide-react"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function CreateTokenPage() {
  const router = useRouter()
  const { activeAccount } = useWalletConnection()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    decimals: '6',
    totalSupply: '',
    description: '',
    website: '',
    twitter: '',
    telegram: '',
    initialPrice: ''
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [createdTokenId, setCreatedTokenId] = useState<string | null>(null)
  const [showDeployDialog, setShowDeployDialog] = useState(false)
  const [mnemonic, setMnemonic] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive"
        })
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be less than 5MB",
          variant: "destructive"
        })
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

  const handleCreateDraft = async () => {
    if (!activeAccount) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to create a token",
        variant: "destructive"
      })
      return
    }

    // Validation
    if (!formData.name || !formData.symbol || !formData.totalSupply) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      setIsCreating(true)

      // Upload logo if provided
      let logoPath = null
      if (logoFile) {
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

        logoPath = uploadData.logoPath
      }

      // Create token draft
      const response = await fetch('/api/launchpad/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          creatorAddress: activeAccount.address,
          logoPath
        })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to create token')
      }

      setCreatedTokenId(data.token.id)
      
      toast({
        title: "Token Draft Created",
        description: "Your token draft has been saved. You can now deploy it to the blockchain."
      })

      // Show deploy dialog
      setShowDeployDialog(true)
    } catch (error: any) {
      console.error('Error creating token:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create token",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeploy = async () => {
    if (!createdTokenId || !activeAccount || !mnemonic) {
      toast({
        title: "Missing Information",
        description: "Please provide your wallet mnemonic to deploy the token",
        variant: "destructive"
      })
      return
    }

    try {
      setIsDeploying(true)

      const response = await fetch('/api/launchpad/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: createdTokenId,
          creatorAddress: activeAccount.address,
          mnemonic
        })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to deploy token')
      }

      toast({
        title: "Token Deployed!",
        description: `Your token has been deployed with Asset ID: ${data.assetId}. It will be active after the cooldown period.`
      })

      // Navigate to launchpad page
      router.push('/launchpad')
    } catch (error: any) {
      console.error('Error deploying token:', error)
      toast({
        title: "Deployment Failed",
        description: error.message || "Failed to deploy token",
        variant: "destructive"
      })
    } finally {
      setIsDeploying(false)
      setMnemonic('')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/launchpad')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Launchpad
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Launch Your Token</h1>
        <p className="text-muted-foreground mt-2">
          Create and deploy your token on 10xSwap DEX
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Token Information</CardTitle>
          <CardDescription>
            Fill in the details for your token. All fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Token Logo</Label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2">
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
                  {formData.symbol ? formData.symbol.substring(0, 2).toUpperCase() : '?'}
                </div>
              )}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoSelect}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Logo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, SVG or WebP. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., My Token"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                name="symbol"
                placeholder="e.g., MTK"
                value={formData.symbol}
                onChange={handleInputChange}
                className="uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="decimals">Decimals *</Label>
              <Input
                id="decimals"
                name="decimals"
                type="number"
                min="0"
                max="19"
                value={formData.decimals}
                onChange={handleInputChange}
              />
              <p className="text-xs text-muted-foreground">
                Usually 6 for Algorand tokens
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalSupply">Total Supply *</Label>
              <Input
                id="totalSupply"
                name="totalSupply"
                placeholder="1000000"
                value={formData.totalSupply}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialPrice">Initial Price (USD)</Label>
            <Input
              id="initialPrice"
              name="initialPrice"
              type="number"
              step="0.000001"
              placeholder="0.10"
              value={formData.initialPrice}
              onChange={handleInputChange}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your token..."
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="font-medium">Social Links (Optional)</h3>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter</Label>
              <Input
                id="twitter"
                name="twitter"
                type="url"
                placeholder="https://twitter.com/yourtoken"
                value={formData.twitter}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram</Label>
              <Input
                id="telegram"
                name="telegram"
                type="url"
                placeholder="https://t.me/yourtoken"
                value={formData.telegram}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/launchpad')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateDraft}
            disabled={isCreating || !activeAccount}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Create & Deploy
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Deploy Dialog */}
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy Token to Blockchain</DialogTitle>
            <DialogDescription>
              To deploy your token to the Algorand blockchain, please enter your wallet's 25-word mnemonic phrase.
              This is required to sign the transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mnemonic">Wallet Mnemonic (25 words)</Label>
              <Textarea
                id="mnemonic"
                placeholder="Enter your 25-word mnemonic phrase..."
                rows={4}
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your mnemonic is never stored and is only used to sign this transaction.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeployDialog(false)
                setMnemonic('')
              }}
              disabled={isDeploying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={isDeploying || !mnemonic}
              className="gap-2"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Deploy Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
