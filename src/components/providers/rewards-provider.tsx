"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
import { RewardsSlidingPanel, RewardsFloatingButton } from "@/components/features/rewards/rewards-sliding-panel"

// Pages where the rewards floating button should be visible
const REWARDS_VISIBLE_PAGES = ['/portfolio', '/launchpad', '/trade']

export function RewardsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [hasClaimable, setHasClaimable] = useState(false)
  const { activeAccount } = useWalletConnection()

  // Check if rewards button should be visible on current page
  const showRewardsButton = REWARDS_VISIBLE_PAGES.some(page => pathname?.startsWith(page))

  // Check for claimable quests
  useEffect(() => {
    const checkClaimable = async () => {
      if (!activeAccount?.address) {
        setHasClaimable(false)
        return
      }

      try {
        const res = await fetch(`/api/rewards/quests?userId=${activeAccount.address}`)
        const data = await res.json()
        if (data.success) {
          const hasCompleted = data.data.some((q: any) => q.status === 'completed')
          setHasClaimable(hasCompleted)
        }
      } catch (error) {
        console.error('Failed to check claimable quests:', error)
      }
    }

    checkClaimable()
    const interval = setInterval(checkClaimable, 30000)
    return () => clearInterval(interval)
  }, [activeAccount])

  return (
    <>
      {children}
      {showRewardsButton && (
        <RewardsFloatingButton 
          onClick={() => setIsPanelOpen(true)} 
          hasClaimable={hasClaimable} 
        />
      )}
      <RewardsSlidingPanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
      />
    </>
  )
}
