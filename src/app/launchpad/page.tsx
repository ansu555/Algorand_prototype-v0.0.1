"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SearchBar } from "@/components/shared/search-bar"
import { Rocket, TrendingUp, Users, Zap, Clock, Target, Shield, Flame } from "lucide-react"
import Link from "next/link"

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
}

export default function LaunchpadPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'graduated'>('active')
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

  return (
    <div className="min-h-screen p-6">
      <SearchBar />
      
      <div className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Rocket className="h-8 w-8 text-red-500" />
              Token Launchpad
            </h1>
            <p className="text-muted-foreground mt-1">
              Fair-launch bonding curve with anti-bot protection
            </p>
          </div>
          
          <Link href="/launchpad/create">
            <Button className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700">
              <Zap className="h-4 w-4 mr-2" />
              Launch Your Token
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Launches</p>
                  <p className="text-3xl font-bold">
                    {projects.filter(p => p.status === 'active').length}
                  </p>
                </div>
                <Flame className="h-10 w-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Raised</p>
                  <p className="text-3xl font-bold">
                    {formatAlgo(projects.reduce((sum, p) => sum + Number(p.algoRaised), 0).toString())} ALGO
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Participants</p>
                  <p className="text-3xl font-bold">
                    {projects.reduce((sum, p) => sum + p.participantCount, 0)}
                  </p>
                </div>
                <Users className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Graduated</p>
                  <p className="text-3xl font-bold">
                    {projects.filter(p => p.status === 'graduated').length}
                  </p>
                </div>
                <Target className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All Projects
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
            size="sm"
          >
            <Flame className="h-4 w-4 mr-1" />
            Active
          </Button>
          <Button
            variant={filter === 'graduated' ? 'default' : 'outline'}
            onClick={() => setFilter('graduated')}
            size="sm"
          >
            <Target className="h-4 w-4 mr-1" />
            Graduated
          </Button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Rocket className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Projects Yet</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Be the first to launch a token on our fair-launch platform with bonding curve mechanics.
              </p>
              <Link href="/launchpad/create">
                <Button className="bg-gradient-to-r from-red-600 to-amber-600">
                  Launch Your Token
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const progress = calculateProgress(project.tokensSold, project.tokensForSale)
              const raised = formatAlgo(project.algoRaised)
              const target = formatAlgo(project.bondingTarget)
              
              return (
                <Link key={project.id} href={`/launchpad/${project.id}`}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-red-200 dark:hover:border-red-800/30">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {project.logoUrl ? (
                            <img src={project.logoUrl} alt={project.tokenName} className="h-12 w-12 rounded-full" />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-white font-bold text-xl">
                              {project.tokenSymbol?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg">{project.tokenName}</CardTitle>
                            <p className="text-sm text-muted-foreground">${project.tokenSymbol}</p>
                          </div>
                        </div>
                        
                        <Badge 
                          variant={project.status === 'active' ? 'default' : 'secondary'}
                          className={project.status === 'active' ? 'bg-green-600' : ''}
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      
                      {/* Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Sale Progress</span>
                          <span className="text-xs font-semibold">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Raised</p>
                          <p className="text-sm font-bold">{raised} / {target} ALGO</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Participants</p>
                          <p className="text-sm font-bold">{project.participantCount}</p>
                        </div>
                      </div>
                      
                      {/* Features */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Shield className="h-3 w-3" />
                          Anti-Bot
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {project.curveType}
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          LP Locked
                        </Badge>
                      </div>
                      
                      <Button className="w-full" variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status === 'active' ? 'Buy Now' : 'View Details'}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
