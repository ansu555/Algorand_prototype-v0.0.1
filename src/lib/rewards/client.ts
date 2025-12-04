'use client'

interface TrackActionPayload {
  userId: string
  actionType: string
  metadata?: Record<string, any>
}

export async function fetchRewardsSummary(userId: string) {
  const url = `/api/rewards?userId=${encodeURIComponent(userId)}&_=${Date.now()}`
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch rewards summary')
  }
  return data.data
}

export async function trackRewardsAction({ userId, actionType, metadata }: TrackActionPayload) {
  const res = await fetch('/api/rewards/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    cache: 'no-store',
    body: JSON.stringify({ userId, actionType, metadata })
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to track rewards action')
  }
  return data
}
