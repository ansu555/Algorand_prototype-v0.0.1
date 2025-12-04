// "use client"

// import Link from "next/link"
// import { useCallback, useEffect, useMemo, useState } from 'react'
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { RefreshCcw, TrendingUp, Clock3, ShieldCheck, ArrowUpRight, Info } from "lucide-react"
// import { STAKING_CONFIG } from "@/lib/staking/config"
// import { XR_TOKEN_CONFIG } from "@/lib/xrtoken/config"
// import { useWalletActions, useWalletConnection } from "@/components/providers/txnlab-wallet-provider"
// import { StakingClient } from "@/lib/staking/client"
// import { getAlgodClient } from "@/lib/algorand"

// const MICRO = 1_000_000
// const SECONDS_PER_DAY = 86_400
// const DAYS_PER_MONTH = 30
// const DAYS_PER_YEAR = 365
// const APR_HISTORY = [6.8, 6.9, 7.15, 7.05, 7.2, 7.35, 7.12, 7.4, 7.28, 7.61, 7.32]

// const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

// type PoolTelemetry = {
//   totalStaked: bigint
//   rewardRate: bigint
//   rewardsPerShare: bigint
//   lastUpdateTime: bigint
// }

// const INITIAL_POOL: PoolTelemetry = {
//   totalStaked: 0n,
//   rewardRate: 0n,
//   rewardsPerShare: 0n,
//   lastUpdateTime: 0n,
// }

// const formatMicro = (value: bigint, symbol: string) =>
//   `${(Number(value) / MICRO).toLocaleString(undefined, {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 6,
//   })} ${symbol}`

// const formatTimestamp = (seconds: bigint) => {
//   if (seconds === 0n) return '—'
//   return new Date(Number(seconds) * 1000).toLocaleString()
// }

// const buildSparklinePath = (values: number[], width: number, height: number) => {
//   if (values.length === 0) {
//     return { path: '', min: 0, max: 0 }
//   }

//   const min = Math.min(...values)
//   const max = Math.max(...values)
//   const span = max - min || 1

//   const commands = values.map((value, index) => {
//     const x = (index / (values.length - 1 || 1)) * width
//     const normalized = (value - min) / span
//     const y = height - normalized * height
//     return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
//   })

//   return { path: commands.join(' '), min, max }
// }

// export default function StakingPage() {
//   const { activeAccount } = useWalletConnection()
//   const { walletSigner } = useWalletActions()

//   const algodClient = useMemo(() => getAlgodClient(), [])
//   const stakingClient = useMemo(() => new StakingClient(algodClient), [algodClient])

//   const [stakeAmountInput, setStakeAmountInput] = useState('')
//   const [unstakeAmountInput, setUnstakeAmountInput] = useState('')
//   const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake')
//   const [stakedBalance, setStakedBalance] = useState<bigint>(0n)
//   const [xTokenBalance, setXTokenBalance] = useState<bigint>(0n)
//   const [xrTokenBalance, setXrTokenBalance] = useState<bigint>(0n)
//   const [pendingRewards, setPendingRewards] = useState<bigint>(0n)
//   const [poolStats, setPoolStats] = useState<PoolTelemetry>(INITIAL_POOL)
//   const [syncing, setSyncing] = useState(false)
//   const [txPending, setTxPending] = useState(false)
//   const [statusMessage, setStatusMessage] = useState<string | null>(null)
//   const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

//   const resetTelemetry = useCallback(() => {
//     setStakedBalance(0n)
//     setXTokenBalance(0n)
//     setXrTokenBalance(0n)
//     setPendingRewards(0n)
//     setPoolStats(INITIAL_POOL)
//     setLastSyncedAt(null)
//   }, [])

//   const normalizeAmount = useCallback(
//     (value: string): number | null => {
//       const parsed = Number(value)
//       if (!Number.isFinite(parsed) || parsed <= 0) {
//         setStatusMessage('Enter a valid positive amount.')
//         return null
//       }

//       const microAmount = Math.floor(parsed * MICRO)
//       if (microAmount <= 0) {
//         setStatusMessage('Amount is too small after accounting for decimals.')
//         return null
//       }

//       return microAmount
//     },
//     []
//   )

//   const applyStakeRatio = useCallback((ratio: number) => {
//     if (xTokenBalance === 0n) return
//     const decimal = Math.max(0, Math.min(1, ratio))
//     const amount = (Number(xTokenBalance) / MICRO) * decimal
//     setStakeAmountInput(amount.toFixed(2))
//   }, [xTokenBalance])

//   const applyUnstakeRatio = useCallback((ratio: number) => {
//     if (stakedBalance === 0n) return
//     const decimal = Math.max(0, Math.min(1, ratio))
//     const amount = (Number(stakedBalance) / MICRO) * decimal
//     setUnstakeAmountInput(amount.toFixed(2))
//   }, [stakedBalance])

//   const fetchData = useCallback(async () => {
//     if (!activeAccount?.address) {
//       resetTelemetry()
//       return
//     }

//     try {
//       setSyncing(true)
//       setStatusMessage(null)
//       const address = activeAccount.address

//       const [stakeTelemetry, accountInfo] = await Promise.all([
//         stakingClient.getPendingRewards(address),
//         algodClient.accountInformation(address).do(),
//       ])

//       const getAssetBalance = (assetId: number): bigint => {
//         const holding = accountInfo.assets?.find((asset: any) => asset['asset-id'] === assetId)
//         return holding ? BigInt(holding.amount ?? 0) : 0n
//       }

//       setStakedBalance(stakeTelemetry.stakeAmount)
//       setPendingRewards(stakeTelemetry.pendingRewards)
//       setPoolStats({
//         totalStaked: stakeTelemetry.totalStaked,
//         rewardRate: stakeTelemetry.rewardRate,
//         rewardsPerShare: stakeTelemetry.rewardsPerShare,
//         lastUpdateTime: stakeTelemetry.lastUpdateTime,
//       })
//       setXTokenBalance(getAssetBalance(STAKING_CONFIG.stakedAssetId))
//       setXrTokenBalance(getAssetBalance(STAKING_CONFIG.rewardAssetId))
//       setLastSyncedAt(new Date())
//     } catch (error) {
//       console.error('Failed to sync staking data', error)
//       setStatusMessage('Unable to sync staking data right now. Please retry in a few seconds.')
//     } finally {
//       setSyncing(false)
//     }
//   }, [activeAccount?.address, algodClient, resetTelemetry, stakingClient])

//   useEffect(() => {
//     fetchData()
//   }, [fetchData])

//   const handleStake = async () => {
//     if (!activeAccount?.address || !walletSigner) {
//       setStatusMessage('Connect a wallet that can sign transactions.')
//       return
//     }

//     const microAmount = normalizeAmount(stakeAmountInput)
//     if (microAmount === null) return

//     if (BigInt(microAmount) > xTokenBalance) {
//       setStatusMessage('Insufficient X token balance to stake that amount.')
//       return
//     }

//     try {
//       setTxPending(true)
//       await stakingClient.stake(activeAccount.address, microAmount, walletSigner)
//       setStakeAmountInput('')
//       setStatusMessage('Stake submitted. Waiting for confirmation...')
//       await fetchData()
//     } catch (error) {
//       console.error('Stake failed', error)
//       setStatusMessage('Stake transaction failed. Check your wallet and try again.')
//     } finally {
//       setTxPending(false)
//     }
//   }

//   const handleUnstake = async () => {
//     if (!activeAccount?.address || !walletSigner) {
//       setStatusMessage('Connect a wallet that can sign transactions.')
//       return
//     }

//     const microAmount = normalizeAmount(unstakeAmountInput)
//     if (microAmount === null) return

//     if (BigInt(microAmount) > stakedBalance) {
//       setStatusMessage('You cannot unstake more than your staked balance.')
//       return
//     }

//     try {
//       setTxPending(true)
//       await stakingClient.unstake(activeAccount.address, microAmount, walletSigner)
//       setUnstakeAmountInput('')
//       setStatusMessage('Unstake transaction sent.')
//       await fetchData()
//     } catch (error) {
//       console.error('Unstake failed', error)
//       setStatusMessage('Unable to unstake right now. Please retry shortly.')
//     } finally {
//       setTxPending(false)
//     }
//   }

//   const handleClaim = async () => {
//     if (!activeAccount?.address || !walletSigner) {
//       setStatusMessage('Connect a wallet that can sign transactions.')
//       return
//     }

//     if (pendingRewards === 0n) {
//       setStatusMessage('No pending rewards to claim yet.')
//       return
//     }

//     try {
//       setTxPending(true)
//       await stakingClient.claim(activeAccount.address, walletSigner)
//       setStatusMessage('Claim submitted. Rewards will arrive shortly.')
//       await fetchData()
//     } catch (error) {
//       console.error('Claim failed', error)
//       setStatusMessage('Claim transaction failed. Try again in a moment.')
//     } finally {
//       setTxPending(false)
//     }
//   }

//   const rewardRatePerDay = useMemo(() => {
//     return (Number(poolStats.rewardRate) * SECONDS_PER_DAY) / MICRO
//   }, [poolStats.rewardRate])

//   const userSharePercent = useMemo(() => {
//     if (poolStats.totalStaked === 0n) return 0
//     return Number(stakedBalance) / Number(poolStats.totalStaked) * 100
//   }, [poolStats.totalStaked, stakedBalance])

//   const userRewardPerDay = useMemo(() => {
//     if (poolStats.totalStaked === 0n) return 0
//     return (Number(poolStats.rewardRate) * SECONDS_PER_DAY * Number(stakedBalance)) /
//       (Number(poolStats.totalStaked) * MICRO)
//   }, [poolStats.rewardRate, poolStats.totalStaked, stakedBalance])

//   const userRewardPerMonth = userRewardPerDay * DAYS_PER_MONTH

//   const apr = useMemo(() => {
//     if (poolStats.totalStaked === 0n) return 0
//     const yearlyRewards = Number(poolStats.rewardRate) * SECONDS_PER_DAY * DAYS_PER_YEAR
//     return (yearlyRewards / Number(poolStats.totalStaked)) * 100
//   }, [poolStats.rewardRate, poolStats.totalStaked])

//   const aprTrend = APR_HISTORY[APR_HISTORY.length - 1] - APR_HISTORY[0]
//   const chart = useMemo(() => buildSparklinePath(APR_HISTORY, 260, 80), [])

//   const questProgressPct = useMemo(() => {
//     const targetMicro = 25 * MICRO
//     if (targetMicro === 0) return 0
//     return clampPercent((Number(pendingRewards) / targetMicro) * 100)
//   }, [pendingRewards])

//   const coveragePercent = useMemo(() => {
//     const total = xTokenBalance + stakedBalance
//     if (total === 0n) return 0
//     return clampPercent((Number(stakedBalance) / Number(total)) * 100)
//   }, [stakedBalance, xTokenBalance])

//   const questStatusText = questProgressPct >= 100
//     ? 'Quest bonus unlocked'
//     : `${questProgressPct.toFixed(0)}% to streak boost`

//   const autopilotStatus = stakedBalance > 0n ? 'Watching positions' : 'Idle'
//   const autopilotPillTone = stakedBalance > 0n
//     ? 'bg-emerald-400/15 text-emerald-300'
//     : 'bg-white/10 text-white/60'

//   const stakeDisabled = txPending || syncing || !activeAccount?.address
//   const unstakeDisabled = stakeDisabled
//   const claimDisabled = stakeDisabled || pendingRewards === 0n

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-[#030711] via-[#060b18] to-[#03040a] text-white">
//       <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
//         <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1120] via-[#071b25] to-[#06111a] p-8 shadow-2xl shadow-emerald-500/10">
//           <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
//             <div className="space-y-4">
//               <p className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200/80">
//                 <TrendingUp className="h-3 w-3" /> 10xSwap Core Staking
//               </p>
//               <div>
//                 <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
//                   Stake X, power WaveBreak liquidity, farm XR
//                 </h1>
//                 <p className="mt-3 text-base text-emerald-100/80 sm:max-w-xl">
//                   Plug into 10xSwap’s native rewards engine. AutoPilot rules keep allocations balanced, WaveBreak bonding guard rails emissions, and quests amplify every claim you make.
//                 </p>
//               </div>
//               <div className="flex flex-wrap gap-3 text-sm text-emerald-200/80">
//                 <span className="inline-flex items-center gap-1">
//                   <ShieldCheck className="h-4 w-4 text-emerald-400" /> WaveBreak anti-bot shield
//                 </span>
//                 <span className="inline-flex items-center gap-1">
//                   <Clock3 className="h-4 w-4 text-emerald-400" /> AutoPilot heartbeat every block
//                 </span>
//                 <span className="inline-flex items-center gap-1">
//                   <TrendingUp className="h-4 w-4 text-emerald-400" /> Quest multipliers on claim
//                 </span>
//               </div>
//             </div>
//             <div className="min-w-[240px] rounded-2xl border border-white/10 bg-black/30 p-6 text-sm">
//               <div className="flex items-center justify-between text-xs uppercase text-white/50">
//                 <span>Status</span>
//                 <span className="font-medium text-white">{syncing ? 'Syncing' : 'Live'}</span>
//               </div>
//               <div className="mt-4 space-y-2 text-white/80">
//                 <div className="flex justify-between">
//                   <span>Total Value Locked</span>
//                   <span>{formatMicro(poolStats.totalStaked, XR_TOKEN_CONFIG.symbol)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Protocol APR</span>
//                   <span>{apr ? `${apr.toFixed(2)}%` : '—'}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Last Sync</span>
//                   <span>{lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : '—'}</span>
//                 </div>
//               </div>
//               <Button
//                 variant="secondary"
//                 className="mt-6 w-full bg-emerald-500 text-black hover:bg-emerald-400"
//                 onClick={fetchData}
//                 disabled={syncing}
//               >
//                 <RefreshCcw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
//                 Sync telemetry
//               </Button>
//             </div>
//           </div>
//         </section>

//         <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//           <Card className="border-white/10 bg-white/5 text-white">
//             <CardContent className="space-y-1 pt-6">
//               <p className="text-xs uppercase text-white/40">Your staked X</p>
//               <p className="text-2xl font-semibold">{formatMicro(stakedBalance, 'X')}</p>
//               <p className="text-xs text-white/60">Coverage {coveragePercent.toFixed(1)}%</p>
//               <div className="h-1.5 rounded-full bg-white/10">
//                 <div
//                   className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
//                   style={{ width: `${coveragePercent}%` }}
//                 />
//               </div>
//             </CardContent>
//           </Card>
//           <Card className="border-white/10 bg-white/5 text-white">
//             <CardContent className="space-y-1 pt-6">
//               <p className="text-xs uppercase text-white/40">Pending XR</p>
//               <p className="text-2xl font-semibold">{formatMicro(pendingRewards, XR_TOKEN_CONFIG.symbol)}</p>
//               <p className="text-xs text-white/60">Quest status · {questStatusText}</p>
//               <div className="h-1.5 rounded-full bg-white/10">
//                 <div
//                   className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
//                   style={{ width: `${questProgressPct}%` }}
//                 />
//               </div>
//             </CardContent>
//           </Card>
//           <Card className="border-white/10 bg-white/5 text-white">
//             <CardContent className="space-y-1 pt-6">
//               <p className="text-xs uppercase text-white/40">Wallet XR balance</p>
//               <p className="text-2xl font-semibold">{formatMicro(xrTokenBalance, XR_TOKEN_CONFIG.symbol)}</p>
//               <p className="text-xs text-white/60">Emission {rewardRatePerDay.toFixed(2)} XR / day</p>
//             </CardContent>
//           </Card>
//           <Card className="border-white/10 bg-white/5 text-white">
//             <CardContent className="space-y-3 pt-6">
//               <p className="text-xs uppercase text-white/40">Automation</p>
//               <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${autopilotPillTone}`}>
//                 <ShieldCheck className="h-3 w-3" /> {autopilotStatus}
//               </div>
//               <p className="text-xs text-white/60">AutoPilot taps the staking app for rebalancing cues.</p>
//             </CardContent>
//           </Card>
//         </section>

//         {statusMessage && (
//           <div className="rounded-2xl border border-amber-500/30 bg-amber-400/10 p-4 text-sm text-amber-100">
//             {statusMessage}
//           </div>
//         )}

//         <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
//           <div className="space-y-6">
//             <Card className="border-white/10 bg-white/5 text-white">
//               <CardHeader>
//                 <CardTitle className="flex items-center justify-between">
//                   Manage position
//                   <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/60">
//                     {activeAccount?.address ? 'Wallet linked' : 'Connect wallet'}
//                   </div>
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-6">
//                 <div className="rounded-full bg-black/30 p-1 text-sm font-medium text-white/70">
//                   <div className="grid grid-cols-2">
//                     {(['stake', 'unstake'] as const).map((tab) => (
//                       <button
//                         key={tab}
//                         onClick={() => setActiveTab(tab)}
//                         className={`rounded-full px-4 py-2 transition ${
//                           activeTab === tab ? 'bg-emerald-400 text-black shadow' : 'text-white/60'
//                         }`}
//                       >
//                         {tab === 'stake' ? 'Stake' : 'Unstake'}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 {activeTab === 'stake' ? (
//                   <div className="space-y-4">
//                     <div>
//                       <label className="text-sm text-white/70">Amount to stake</label>
//                       <div className="mt-2 flex items-center gap-2">
//                         <Input
//                           value={stakeAmountInput}
//                           onChange={(event) => setStakeAmountInput(event.target.value)}
//                           placeholder="0.0"
//                           className="bg-black/40 text-lg"
//                           inputMode="decimal"
//                         />
//                         <Button
//                           variant="outline"
//                           className="border-white/20 bg-white/10 text-white"
//                           onClick={() =>
//                             setStakeAmountInput(
//                               (Number(xTokenBalance) / MICRO).toFixed(2)
//                             )
//                           }
//                         >
//                           Max
//                         </Button>
//                       </div>
//                       <p className="mt-2 text-xs text-white/50">
//                         Wallet balance: {formatMicro(xTokenBalance, 'X')}
//                       </p>
//                       <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/60">
//                         {[25, 50, 100].map((pct) => (
//                           <button
//                             key={`stake-${pct}`}
//                             onClick={() => applyStakeRatio(pct / 100)}
//                             className="rounded-full border border-white/10 px-3 py-1 transition hover:border-emerald-400/60"
//                             type="button"
//                           >
//                             {pct}%
//                           </button>
//                         ))}
//                       </div>
//                     </div>
//                     <Button
//                       className="w-full bg-emerald-400 text-black hover:bg-emerald-300"
//                       onClick={handleStake}
//                       disabled={stakeDisabled}
//                     >
//                       <ArrowUpRight className="mr-2 h-4 w-4" />
//                       Stake X
//                     </Button>
//                   </div>
//                 ) : (
//                   <div className="space-y-4">
//                     <div>
//                       <label className="text-sm text-white/70">Amount to unstake</label>
//                       <div className="mt-2 flex items-center gap-2">
//                         <Input
//                           value={unstakeAmountInput}
//                           onChange={(event) => setUnstakeAmountInput(event.target.value)}
//                           placeholder="0.0"
//                           className="bg-black/40 text-lg"
//                           inputMode="decimal"
//                         />
//                         <Button
//                           variant="outline"
//                           className="border-white/20 bg-white/10 text-white"
//                           onClick={() =>
//                             setUnstakeAmountInput(
//                               (Number(stakedBalance) / MICRO).toFixed(2)
//                             )
//                           }
//                         >
//                           Max
//                         </Button>
//                       </div>
//                       <p className="mt-2 text-xs text-white/50">
//                         Staked balance: {formatMicro(stakedBalance, 'X')}
//                       </p>
//                       <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/60">
//                         {[25, 50, 100].map((pct) => (
//                           <button
//                             key={`unstake-${pct}`}
//                             onClick={() => applyUnstakeRatio(pct / 100)}
//                             className="rounded-full border border-white/10 px-3 py-1 transition hover:border-emerald-400/60"
//                             type="button"
//                           >
//                             {pct}%
//                           </button>
//                         ))}
//                       </div>
//                     </div>
//                     <Button
//                       className="w-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
//                       onClick={handleUnstake}
//                       disabled={unstakeDisabled}
//                     >
//                       <ArrowUpRight className="mr-2 h-4 w-4 rotate-180" />
//                       Unstake X
//                     </Button>
//                   </div>
//                 )}

//                 <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className="text-xs uppercase text-white/40">Pending rewards</p>
//                       <p className="text-2xl font-semibold">
//                         {formatMicro(pendingRewards, XR_TOKEN_CONFIG.symbol)}
//                       </p>
//                     </div>
//                     <Button
//                       size="sm"
//                       className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-black"
//                       onClick={handleClaim}
//                       disabled={claimDisabled}
//                     >
//                       Claim
//                     </Button>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card className="border-white/10 bg-white/5 text-white">
//               <CardHeader className="flex flex-row items-center justify-between">
//                 <div>
//                   <CardTitle>APR telemetry</CardTitle>
//                   <p className="text-sm text-white/60">Last 11 sync intervals</p>
//                 </div>
//                 <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
//                   aprTrend >= 0 ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'
//                 }`}>
//                   <TrendingUp className={`h-3 w-3 ${aprTrend < 0 ? 'rotate-180' : ''}`} />
//                   {aprTrend >= 0 ? '+' : ''}{aprTrend.toFixed(2)}%
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid gap-6 md:grid-cols-3">
//                   <div>
//                     <p className="text-xs uppercase text-white/40">Current APR</p>
//                     <p className="mt-1 text-3xl font-semibold">{apr.toFixed(2)}%</p>
//                     <p className="text-xs text-white/50">Updated {formatTimestamp(poolStats.lastUpdateTime)}</p>
//                   </div>
//                   <div>
//                     <p className="text-xs uppercase text-white/40">Reward rate / day</p>
//                     <p className="mt-1 text-3xl font-semibold">{rewardRatePerDay.toFixed(2)} XR</p>
//                     <p className="text-xs text-white/50">Protocol emissions</p>
//                   </div>
//                   <div>
//                     <p className="text-xs uppercase text-white/40">Your share</p>
//                     <p className="mt-1 text-3xl font-semibold">{userSharePercent.toFixed(2)}%</p>
//                     <p className="text-xs text-white/50">{userRewardPerDay.toFixed(2)} XR / day</p>
//                   </div>
//                 </div>

//                 <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4">
//                   <svg viewBox="0 0 260 80" className="h-24 w-full">
//                     <path d={chart.path} fill="none" stroke="url(#aprGradient)" strokeWidth={3} />
//                     <defs>
//                       <linearGradient id="aprGradient" x1="0%" y1="0%" x2="100%" y2="0%">
//                         <stop offset="0%" stopColor="#34d399" />
//                         <stop offset="100%" stopColor="#06b6d4" />
//                       </linearGradient>
//                     </defs>
//                   </svg>
//                   <div className="mt-2 flex justify-between text-xs text-white/40">
//                     <span>{chart.min.toFixed(2)}%</span>
//                     <span>{chart.max.toFixed(2)}%</span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           <div className="space-y-6">
//             <Card className="border-white/10 bg-white/5 text-white">
//               <CardHeader>
//                 <CardTitle>Automation & quests</CardTitle>
//                 <p className="text-sm text-white/60">WaveBreak guard rails plus X Token quest telemetry.</p>
//               </CardHeader>
//               <CardContent className="space-y-5 text-sm text-white/70">
//                 <div className="flex items-center justify-between">
//                   <span>AutoPilot status</span>
//                   <span className={`rounded-full px-3 py-1 text-xs ${autopilotPillTone}`}>
//                     {autopilotStatus}
//                   </span>
//                 </div>
//                 <div>
//                   <div className="flex items-center justify-between text-xs uppercase text-white/40">
//                     <span>Quest progress</span>
//                     <span>{questProgressPct.toFixed(0)}%</span>
//                   </div>
//                   <div className="mt-2 h-2 rounded-full bg-white/10">
//                     <div
//                       className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
//                       style={{ width: `${questProgressPct}%` }}
//                     />
//                   </div>
//                   <p className="mt-2 text-xs">{questStatusText}</p>
//                 </div>
//                 <div>
//                   <div className="flex items-center justify-between text-xs uppercase text-white/40">
//                     <span>Coverage</span>
//                     <span>{coveragePercent.toFixed(1)}%</span>
//                   </div>
//                   <div className="mt-2 h-2 rounded-full bg-white/10">
//                     <div
//                       className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
//                       style={{ width: `${coveragePercent}%` }}
//                     />
//                   </div>
//                   <p className="mt-2 text-xs">More coverage unlocks higher WaveBreak tiers.</p>
//                 </div>
//                 <div className="flex flex-col gap-2 sm:flex-row">
//                   <Button
//                     className="flex-1 bg-emerald-400 text-black hover:bg-emerald-300"
//                     onClick={() => setActiveTab('stake')}
//                   >
//                     Boost stake
//                   </Button>
//                   <Button variant="outline" className="flex-1 border-white/20 text-white" asChild>
//                     <Link href="/agent">Open AutoPilot</Link>
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//             <Card className="border-white/10 bg-white/5 text-white">
//               <CardHeader>
//                 <CardTitle>Reward outlook</CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-4 text-sm text-white/70">
//                 <div className="flex items-center justify-between">
//                   <span>Per day</span>
//                   <span className="text-white">{userRewardPerDay.toFixed(2)} XR</span>
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <span>Per month</span>
//                   <span className="text-white">{userRewardPerMonth.toFixed(2)} XR</span>
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <span>Wallet balance</span>
//                   <span className="text-white">{formatMicro(xrTokenBalance, XR_TOKEN_CONFIG.symbol)}</span>
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <span>Contract emissions</span>
//                   <span className="text-white">{rewardRatePerDay.toFixed(2)} XR / day</span>
//                 </div>
//                 <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-white/60">
//                   <div className="flex items-center gap-2">
//                     <Info className="h-4 w-4" />
//                     Rewards stream continuously and can be claimed every block without penalty.
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card className="border-white/10 bg-white/5 text-white">
//               <CardHeader>
//                 <CardTitle>Contract coordinates</CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-4 text-sm text-white/70">
//                 <div className="flex justify-between gap-4">
//                   <span>Staking App ID</span>
//                   <span className="font-mono text-white">{STAKING_CONFIG.appId}</span>
//                 </div>
//                 <div className="flex justify-between gap-4">
//                   <span>App Address</span>
//                   <span className="truncate font-mono text-white" title={STAKING_CONFIG.appAddress}>
//                     {STAKING_CONFIG.appAddress}
//                   </span>
//                 </div>
//                 <div className="flex justify-between gap-4">
//                   <span>X Token ASA</span>
//                   <span className="font-mono text-white">{STAKING_CONFIG.stakedAssetId}</span>
//                 </div>
//                 <div className="flex justify-between gap-4">
//                   <span>{XR_TOKEN_CONFIG.symbol} ASA</span>
//                   <span className="font-mono text-white">{STAKING_CONFIG.rewardAssetId}</span>
//                 </div>
//                 <div className="flex justify-between gap-4">
//                   <span>Last global update</span>
//                   <span className="text-white">{formatTimestamp(poolStats.lastUpdateTime)}</span>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
