"use client"

import { useEffect, useState } from "react"
import { SearchBar } from "@/components/shared/search-bar"
import { Button } from "@/components/ui/button"
import { Rocket } from "lucide-react"
import Link from "next/link"
import { TokenLaunchCard } from "@/components/features/launchpad/token-launch-card"
import { LaunchpadFilters } from "@/components/features/launchpad/launchpad-filters"

interface Project {
  id: string
  tokenName: string
  tokenSymbol: string
  description?: string
  logoUrl?: string
  status: string
  tokensSold: string
  tokensForSale: string
  algoRaised: string
  bondingTarget: string
  participantCount: number
  basePrice: string
  maxPrice: string
  curveType: string
  createdAt: string
  creatorAddress?: string
}

export default function LaunchpadPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [filter])

  const loadProjects = async () => {
    try {
      const statusParam = filter === 'all' ? '' : `?status=${filter}`
      const res = await fetch(`/api/launchpad/projects${statusParam}`)
      const data = await res.json()

      if (data.success) {
        setProjects(data.data)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (sold: string, total: string) => {
    const soldNum = Number(sold)
    const totalNum = Number(total)
    return totalNum > 0 ? (soldNum / totalNum) * 100 : 0
  }

  const formatAlgo = (microAlgo: string) => {
    return (Number(microAlgo) / 1_000_000).toFixed(2)
  }

  // Filter and Sort Logic
  const filteredProjects = projects
    .filter(p => {
      const matchesSearch = p.tokenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sort === 'marketcap') return Number(b.algoRaised) - Number(a.algoRaised) // Proxy for market cap
      return 0
    })

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar (Search + Actions) */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            Launchpad
          </div>

          <div className="flex-1 max-w-md">
            <SearchBar placeholder="Search tokens..." onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <Link href="/launchpad/create">
              <Button className="bg-[#F3C623] text-black hover:bg-[#F3C623]/90 font-semibold">
                <Rocket className="h-4 w-4 mr-2" />
                Launch Token
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Filters and Grid */}
        <div className="space-y-6">
          <LaunchpadFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentFilter={filter}
            onFilterChange={setFilter}
            currentSort={sort}
            onSortChange={setSort}
          />

          {loading ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground animate-pulse">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/50 rounded-lg">
              <p className="text-muted-foreground">No projects found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map((project) => {
                const progress = calculateProgress(project.tokensSold, project.tokensForSale)
                // Estimate market cap based on bonding target (simplified)
                const marketCap = `$${formatAlgo(project.bondingTarget)}`

                return (
                  <TokenLaunchCard
                    key={project.id}
                    id={project.id}
                    name={project.tokenName}
                    symbol={project.tokenSymbol}
                    description={project.description}
                    logoUrl={project.logoUrl}
                    status={project.status}
                    progress={progress}
                    marketCap={marketCap}
                    createdAt={project.createdAt}
                    creator={project.creatorAddress}
                  />
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

