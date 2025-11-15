"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchBar } from "@/components/shared/search-bar"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import {
  Image,
  TrendingUp,
  Users,
  Sparkles,
  ArrowRight,
  Building,
  Leaf,
  TrendingDown,
  Wallet,
} from "lucide-react"
import type { FractionalizedAsset, AssetCategory } from "@/lib/fractionalize/types"
import { CATEGORY_LABELS, CATEGORY_DESCRIPTIONS } from "@/lib/fractionalize/types"

export default function FractionalizePage() {
  const router = useRouter()
  const { activeAccount } = useWalletConnection()
  const [assets, setAssets] = useState<FractionalizedAsset[]>([])
  const [topAssets, setTopAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all')

  useEffect(() => {
    loadAssets()
    loadTopAssets()
  }, [selectedCategory])

  const loadAssets = async () => {
    try {
      const categoryParam = selectedCategory !== 'all' ? `&category=${selectedCategory}` : ''
      const res = await fetch(`/api/fractionalize/assets?status=active${categoryParam}&_=${Date.now()}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      if (data.success) {
        setAssets(data.data)
      }
    } catch (error) {
      console.error('Failed to load assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTopAssets = async () => {
    try {
      const res = await fetch('/api/fractionalize/assets?action=top&limit=5')
      const data = await res.json()
      if (data.success) {
        setTopAssets(data.data)
      }
    } catch (error) {
      console.error('Failed to load top assets:', error)
    }
  }

  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
      case 'art':
        return <Image className="h-4 w-4" />
      case 'realestate':
        return <Building className="h-4 w-4" />
      case 'vc':
        return <TrendingUp className="h-4 w-4" />
      case 'carbon':
        return <Leaf className="h-4 w-4" />
      case 'collectible':
        return <Sparkles className="h-4 w-4" />
    }
  }

  const formatAlgo = (microAlgos: number) => {
    return (microAlgos / 1_000_000).toFixed(2)
  }

  return (
    <div className="min-h-screen p-6">
      <SearchBar />

      <div className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wallet className="h-7 w-7 text-blue-500" />
              FractionalizeASA
            </h1>
            <p className="text-muted-foreground mt-1">
              Own fractions of high-value assets on Algorand blockchain
            </p>
          </div>
          <Button onClick={() => router.push('/fractionalize/create')} size="lg">
            Create Fractionalization
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-3xl font-bold">{assets.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Investors</p>
                  <p className="text-3xl font-bold">1,234</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                  <p className="text-3xl font-bold">₳ 2.5M</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-3xl font-bold">5</p>
                </div>
                <Sparkles className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="art">
              <Image className="h-4 w-4 mr-2" />
              Art
            </TabsTrigger>
            <TabsTrigger value="realestate">
              <Building className="h-4 w-4 mr-2" />
              Real Estate
            </TabsTrigger>
            <TabsTrigger value="vc">
              <TrendingUp className="h-4 w-4 mr-2" />
              Venture Capital
            </TabsTrigger>
            <TabsTrigger value="carbon">
              <Leaf className="h-4 w-4 mr-2" />
              Carbon Credits
            </TabsTrigger>
            <TabsTrigger value="collectible">
              <Sparkles className="h-4 w-4 mr-2" />
              Collectibles
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading assets...</p>
              </div>
            ) : assets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Image className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Assets Available</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Be the first to fractionalize an asset in this category
                  </p>
                  <Button onClick={() => router.push('/fractionalize/create')}>
                    Create Fractionalization
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map((asset) => {
                  const soldPercentage = (asset.fractions_sold / asset.total_fractions) * 100
                  const available = asset.total_fractions - asset.fractions_sold

                  return (
                    <Card
                      key={asset.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => router.push(`/fractionalize/${asset.id}`)}
                    >
                      <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                        <img
                          src={asset.image_url}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-white/90 text-black">
                            {getCategoryIcon(asset.category)}
                            <span className="ml-1">{CATEGORY_LABELS[asset.category]}</span>
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2 truncate">{asset.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {asset.description}
                        </p>

                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{soldPercentage.toFixed(1)}%</span>
                            </div>
                            <Progress value={soldPercentage} className="h-2" />
                          </div>

                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-muted-foreground">Price per fraction</p>
                              <p className="font-bold">₳ {formatAlgo(asset.fraction_price)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Available</p>
                              <p className="font-bold">{available.toLocaleString()}</p>
                            </div>
                          </div>

                          <Button className="w-full" size="sm">
                            View Details
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
