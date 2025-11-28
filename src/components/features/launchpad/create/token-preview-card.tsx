import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rocket, Shield, Zap, Lock } from "lucide-react"

interface TokenPreviewProps {
    formData: {
        tokenName: string
        tokenSymbol: string
        description: string
        logoPreview: string | null
        totalSupply: string
        tokensForSale: string
        curveType: string
        basePrice: string
        maxPrice: string
        bondingTarget: string
        maxPurchasePerTx: string
        maxPurchasePerUser: string
        cooldownBlocks: string
        earlyBonusMultiplier: string
        dexChoice: string
        lpLockDays: string
    }
}

export function TokenPreviewCard({ formData }: TokenPreviewProps) {
    return (
        <Card className="sticky top-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-lg font-medium">Token Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Header Preview */}
                <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-border">
                        {formData.logoPreview ? (
                            <img src={formData.logoPreview} alt="Token Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 text-xl font-bold text-muted-foreground">
                                {formData.tokenSymbol?.[0]?.toUpperCase() || "?"}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-xl leading-none">{formData.tokenName || "Token Name"}</h3>
                        <p className="text-sm text-muted-foreground font-medium">${formData.tokenSymbol || "SYMBOL"}</p>
                    </div>
                </div>

                {/* Description */}
                <div className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground min-h-[60px]">
                    {formData.description || "Token description will appear here..."}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                        <p className="text-xs text-muted-foreground">Total Supply</p>
                        <p className="font-semibold text-sm truncate">{Number(formData.totalSupply || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                        <p className="text-xs text-muted-foreground">For Sale</p>
                        <p className="font-semibold text-sm truncate">{Number(formData.tokensForSale || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                        <p className="text-xs text-muted-foreground">Start Price</p>
                        <p className="font-semibold text-sm">{formData.basePrice} ALGO</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                        <p className="text-xs text-muted-foreground">Target</p>
                        <p className="font-semibold text-sm">{formData.bondingTarget || 0} ALGO</p>
                    </div>
                </div>

                {/* Features Badges */}
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <Shield className="w-3 h-3 mr-1" />
                        Anti-Bot
                    </Badge>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                        <Zap className="w-3 h-3 mr-1" />
                        {formData.earlyBonusMultiplier}x Bonus
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                        <Lock className="w-3 h-3 mr-1" />
                        {formData.lpLockDays}d Lock
                    </Badge>
                </div>

                {/* Launch Summary */}
                <div className="pt-4 border-t border-border/50 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Network</span>
                        <span className="font-medium">Algorand Testnet</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">DEX</span>
                        <span className="font-medium capitalize">{formData.dexChoice}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Curve</span>
                        <span className="font-medium capitalize">{formData.curveType}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
