"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { SearchBar } from "@/components/shared/search-bar"
import { Gift, Trophy, Flame, Target, Sparkles, CheckCircle, Lock, Clock } from "lucide-react"
import type { UserRewards, Quest, QuestStatus } from "@/lib/rewards/types"
import { LEVEL_THRESHOLDS } from "@/lib/rewards/types"

export default function RewardsPage() {
  const { activeAccount } = useWalletConnection()
  const [rewards, setRewards] = useState<UserRewards | null>(null)
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    if (activeAccount?.address) {
      loadRewards()
      loadQuests()
    }
  }, [activeAccount])

  const loadRewards = async () => {
    if (!activeAccount?.address) return
    
    try {
      const res = await fetch(`/api/rewards?userId=${activeAccount.address}&_=${Date.now()}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      if (data.success) {
        setRewards(data.data)
      }
    } catch (error) {
      console.error('Failed to load rewards:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuests = async () => {
    if (!activeAccount?.address) return
    
    try {
      const res = await fetch(`/api/rewards/quests?userId=${activeAccount.address}&_=${Date.now()}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      if (data.success) {
        setQuests(data.data)
      }
    } catch (error) {
      console.error('Failed to load quests:', error)
    }
  }

  const claimReward = async (questId: string) => {
    if (!activeAccount?.address || claiming) return
    
    setClaiming(questId)
    try {
      const res = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeAccount.address, questId }),
        cache: 'no-store'
      })
      
      const data = await res.json()
      console.log('Claim response:', data)
      
      if (data.success) {
        // Wait a bit for database to flush
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Force reload with cache busting
        await Promise.all([
          loadRewards(),
          loadQuests()
        ])
        
        // Update local state immediately to prevent UI lag
        setQuests(prev => prev.map(q => 
          q.id === questId ? { ...q, status: 'claimed' as QuestStatus } : q
        ))
      } else {
        console.error('Claim failed:', data.error)
        alert(data.error || 'Failed to claim reward')
      }
    } catch (error) {
      console.error('Failed to claim reward:', error)
      alert('Failed to claim reward. Please try again.')
    } finally {
      setClaiming(null)
    }
  }

  const nextLevelXP = LEVEL_THRESHOLDS[rewards?.level || 0] || 0
  const currentLevelXP = LEVEL_THRESHOLDS[(rewards?.level || 1) - 1] || 0
  const progressToNextLevel = rewards ? ((rewards.experiencePoints - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 0

  const activeQuests = quests.filter(q => q.status === 'active' && q.progress! < q.requirement.count)
  const completedQuests = quests.filter(q => q.status === 'completed')
  const claimedQuests = quests.filter(q => q.status === 'claimed')

  if (!activeAccount) {
    return (
      <div className="min-h-screen p-6">
        <SearchBar />
        <div className="max-w-6xl mx-auto mt-12">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Gift className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Connect your wallet to start earning X tokens and unlock exclusive rewards
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <SearchBar />
      
      <div className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Gift className="h-8 w-8 text-red-500" />
              X Token Rewards
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete quests and earn X tokens to unlock exclusive benefits
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-red-500/10 to-amber-500/10 border-red-200/20 dark:border-red-800/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">X Token Balance</p>
                  <p className="text-4xl font-bold font-mono">{rewards?.xTokenBalance.toFixed(0) || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rewards?.totalEarned.toFixed(0) || 0} earned total
                  </p>
                </div>
                <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Level {rewards?.level || 1}</p>
                  <Progress value={progressToNextLevel} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {rewards?.experiencePoints || 0} / {nextLevelXP} XP
                  </p>
                </div>
                <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center ml-4">
                  <Trophy className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Daily Streak</p>
                  <p className="text-4xl font-bold">{rewards?.streakDays || 0}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {rewards && rewards.streakDays >= 7 ? `${Math.floor((rewards.streakDays / 7) * 1.5)}x multiplier` : 'Keep going!'}
                  </p>
                </div>
                <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Flame className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Challenge */}
        <Card className="border-amber-200/20 dark:border-amber-800/20 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Daily Challenge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold mb-2">Login Daily (Day {rewards?.streakDays || 0}/30)</p>
                <Progress value={((rewards?.streakDays || 0) / 30) * 100} className="h-2 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Keep your streak alive to earn bonus multipliers!
                </p>
              </div>
              <div className="ml-6 text-right">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">+5 X</p>
                <Badge variant="secondary" className="mt-2">Claimed Today ✓</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Quests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              Active Quests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeQuests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                All quests completed! Check back later for more.
              </p>
            ) : (
              activeQuests.map((quest) => (
                <div key={quest.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-3xl">{quest.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold">{quest.title}</p>
                      <p className="text-sm text-muted-foreground">{quest.description}</p>
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Progress value={(quest.progress! / quest.requirement.count) * 100} className="flex-1 h-2" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {quest.progress}/{quest.requirement.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">+{quest.reward} X</p>
                    <Badge variant="secondary" className="mt-2">In Progress</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Completed Quests */}
        {completedQuests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Ready to Claim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedQuests.map((quest) => (
                <div key={quest.id} className="flex items-center justify-between p-4 border border-green-500/20 rounded-lg bg-green-50/50 dark:bg-green-950/20">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-3xl">{quest.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold">{quest.title}</p>
                      <p className="text-sm text-muted-foreground">{quest.description}</p>
                      <Badge variant="default" className="mt-2 bg-green-600">Completed ✓</Badge>
                    </div>
                  </div>
                  <div className="ml-4">
                    <Button 
                      onClick={() => claimReward(quest.id)}
                      disabled={claiming !== null}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {claiming === quest.id ? 'Claiming...' : `Claim +${quest.reward} X`}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Claimed History */}
        {claimedQuests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Claimed Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {claimedQuests.slice(0, 6).map((quest) => (
                  <div key={quest.id} className="flex items-center gap-3 p-3 border rounded-lg opacity-60">
                    <div className="text-2xl">{quest.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{quest.title}</p>
                      <p className="text-xs text-muted-foreground">+{quest.reward} X claimed</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
