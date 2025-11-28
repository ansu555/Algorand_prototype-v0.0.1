"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { Gift, Trophy, Flame, Target, Sparkles, CheckCircle, X, ChevronRight, Star, Zap } from "lucide-react"
import type { UserRewards, Quest, QuestStatus } from "@/lib/rewards/types"
import { LEVEL_THRESHOLDS } from "@/lib/rewards/types"
import { cn } from "@/lib/utils"

interface RewardsSlidingPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function RewardsSlidingPanel({ isOpen, onClose }: RewardsSlidingPanelProps) {
  const { activeAccount } = useWalletConnection()
  const [rewards, setRewards] = useState<UserRewards | null>(null)
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    if (!activeAccount?.address || !isOpen) return

    ;(async () => {
      await loadRewards()
      await loadQuests()
    })()
  }, [activeAccount, isOpen])

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
      
      if (data.success) {
        setQuests(prev => prev.map(q => 
          q.id === questId ? { ...q, status: 'claimed' as QuestStatus } : q
        ))
        
        if (data.data) {
          if (data.data.quests) setQuests(data.data.quests)
          if (data.data.rewards) setRewards(data.data.rewards)
        } else {
          await new Promise(resolve => setTimeout(resolve, 200))
          await Promise.all([loadRewards(), loadQuests()])
        }
      } else {
        await Promise.all([loadRewards(), loadQuests()])
      }
    } catch (error) {
      console.error('Failed to claim reward:', error)
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

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Sliding Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-[320px] md:w-[380px] bg-background/95 backdrop-blur-xl border-r border-border/50 z-[101] shadow-2xl transition-transform duration-300 ease-out overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-transparent pb-4">
          <div className="flex items-center justify-between p-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Gift className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Rewards</h2>
                <p className="text-[10px] text-muted-foreground">Earn X Tokens</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-80px)] overflow-y-auto px-4 pb-6 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {!activeAccount ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Gift className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">Connect Wallet</p>
              <p className="text-xs text-muted-foreground">to start earning rewards</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Balance Card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-red-500/5 border border-amber-500/20 p-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">X Token Balance</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">{rewards?.xTokenBalance.toFixed(0) || 0}</span>
                    <span className="text-lg font-medium text-amber-600 dark:text-amber-400">X</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {rewards?.totalEarned.toFixed(0) || 0} earned total
                  </p>
                </div>
              </div>

              {/* Level & Streak Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Level */}
                <div className="rounded-xl bg-card/50 border border-border/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Trophy className="h-3 w-3 text-blue-500" />
                    </div>
                    <span className="text-xs font-medium">Level {rewards?.level || 1}</span>
                  </div>
                  <Progress value={progressToNextLevel} className="h-1.5 mb-1" />
                  <p className="text-[10px] text-muted-foreground">
                    {rewards?.experiencePoints || 0}/{nextLevelXP} XP
                  </p>
                </div>

                {/* Streak */}
                <div className="rounded-xl bg-card/50 border border-border/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Flame className="h-3 w-3 text-orange-500" />
                    </div>
                    <span className="text-xs font-medium">Streak</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold">{rewards?.streakDays || 0}</span>
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                  {rewards && rewards.streakDays >= 7 && (
                    <p className="text-[10px] text-green-500 mt-0.5">
                      {Math.floor((rewards.streakDays / 7) * 1.5)}x bonus
                    </p>
                  )}
                </div>
              </div>

              {/* Completed Quests (Ready to Claim) */}
              {completedQuests.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">Ready to Claim</span>
                    <Badge variant="secondary" className="h-4 text-[10px] px-1.5 bg-green-500/10 text-green-600">
                      {completedQuests.length}
                    </Badge>
                  </div>
                  {completedQuests.map((quest) => (
                    <div
                      key={quest.id}
                      className="group rounded-lg border border-green-500/30 bg-green-500/5 p-3 hover:bg-green-500/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{quest.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{quest.description}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => claimReward(quest.id)}
                          disabled={claiming !== null}
                          className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 shrink-0"
                        >
                          {claiming === quest.id ? (
                            <div className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>+{quest.reward} X</>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Quests */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">Active Quests</span>
                </div>
                {activeQuests.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">All quests completed!</p>
                  </div>
                ) : (
                  activeQuests.slice(0, 5).map((quest) => (
                    <div
                      key={quest.id}
                      className="rounded-lg border border-border/50 bg-card/30 p-3 hover:bg-card/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{quest.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{quest.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                          +{quest.reward} X
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(quest.progress! / quest.requirement.count) * 100} className="flex-1 h-1.5" />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {quest.progress}/{quest.requirement.count}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Claimed History */}
              {claimedQuests.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-muted-foreground">Claimed</span>
                  </div>
                  <div className="space-y-1">
                    {claimedQuests.slice(0, 4).map((quest) => (
                      <div
                        key={quest.id}
                        className="flex items-center gap-2 rounded-lg p-2 opacity-60"
                      >
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        <p className="text-xs truncate flex-1">{quest.title}</p>
                        <span className="text-[10px] text-muted-foreground">+{quest.reward}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// Floating Rewards Button Component
export function RewardsFloatingButton({ onClick, hasClaimable }: { onClick: () => void; hasClaimable?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="fixed left-4 top-1/2 -translate-y-1/2 z-[99] group"
    >
      <div className="relative">
        {/* Main Button */}
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-amber-500/30">
          <Gift className="h-5 w-5 text-white" />
        </div>
        
        {/* Notification Dot */}
        {hasClaimable && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center text-[8px] font-bold text-white">!</span>
          </span>
        )}

        {/* Hover Label */}
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm border border-border/50 rounded-lg px-2 py-1 shadow-lg whitespace-nowrap">
            <span className="text-xs font-medium">Rewards</span>
          </div>
        </div>
      </div>
    </button>
  )
}
