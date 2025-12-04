import algosdk from 'algosdk'
import { STAKING_CONFIG } from './config'
import { STAKING_ABI } from './abi'

const PRECISION = BigInt(1_000_000_000_000)

type StakeInfo = {
  amount: bigint
  rewardDebt: bigint
}

type GlobalState = {
  totalStaked: bigint
  rewardRate: bigint
  rewardsPerShare: bigint
  lastUpdateTime: bigint
}

const decodeStateKey = (key: string) => {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    try {
      return window.atob(key)
    } catch (error) {
      return key
    }
  }

  const nodeBuffer = (globalThis as any)?.Buffer
  if (nodeBuffer) {
    return nodeBuffer.from(key, 'base64').toString('utf8')
  }

  return key
}

export class StakingClient {
  private client: algosdk.Algodv2
  private appId: number
  private contract: algosdk.ABIContract

  constructor(client: algosdk.Algodv2) {
    this.client = client
    this.appId = STAKING_CONFIG.appId
    this.contract = new algosdk.ABIContract(STAKING_ABI)
  }

  async stake(sender: string, amount: number, signer: any) {
    const atc = new algosdk.AtomicTransactionComposer()
    const sp = await this.client.getTransactionParams().do()

    const xferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender,
      to: STAKING_CONFIG.appAddress,
      amount,
      assetIndex: STAKING_CONFIG.stakedAssetId,
      suggestedParams: sp
    } as any)

    atc.addMethodCall({
      appID: this.appId,
      method: this.contract.getMethodByName('stake'),
      methodArgs: [{ txn: xferTxn, signer }],
      sender,
      signer,
      suggestedParams: sp,
      boxes: [{ appIndex: this.appId, name: algosdk.decodeAddress(sender).publicKey }],
      appForeignAssets: [STAKING_CONFIG.rewardAssetId]
    })

    return atc.execute(this.client, 4)
  }

  async unstake(sender: string, amount: number, signer: any) {
    const atc = new algosdk.AtomicTransactionComposer()
    const sp = await this.client.getTransactionParams().do()
    sp.fee = 3000 as any

    atc.addMethodCall({
      appID: this.appId,
      method: this.contract.getMethodByName('unstake'),
      methodArgs: [amount],
      sender,
      signer,
      suggestedParams: sp,
      boxes: [{ appIndex: this.appId, name: algosdk.decodeAddress(sender).publicKey }],
      appForeignAssets: [STAKING_CONFIG.stakedAssetId, STAKING_CONFIG.rewardAssetId]
    })

    return atc.execute(this.client, 4)
  }

  async claim(sender: string, signer: any) {
    const atc = new algosdk.AtomicTransactionComposer()
    const sp = await this.client.getTransactionParams().do()
    sp.fee = 2000 as any

    atc.addMethodCall({
      appID: this.appId,
      method: this.contract.getMethodByName('claim'),
      methodArgs: [],
      sender,
      signer,
      suggestedParams: sp,
      boxes: [{ appIndex: this.appId, name: algosdk.decodeAddress(sender).publicKey }],
      appForeignAssets: [STAKING_CONFIG.rewardAssetId]
    })

    return atc.execute(this.client, 4)
  }

  async getStakeInfo(address: string): Promise<StakeInfo> {
    try {
      const boxName = algosdk.decodeAddress(address).publicKey
      const boxResponse = await this.client.getApplicationBoxByName(this.appId, boxName).do()
      const value: Uint8Array = boxResponse.value

      const view = new DataView(value.buffer, value.byteOffset, value.byteLength)
      const amount = view.getBigUint64(0, false)
      const rewardDebt = view.getBigUint64(8, false)

      return { amount, rewardDebt }
    } catch (error) {
      return { amount: 0n, rewardDebt: 0n }
    }
  }

  private async getGlobalState(): Promise<GlobalState> {
    const appInfo = await this.client.getApplicationByID(this.appId).do()
    const globalState: any[] = (appInfo.params as any)?.['global-state'] || []

    const getValue = (stateKey: string): bigint => {
      const entry = globalState.find((item: any) => decodeStateKey(item.key) === stateKey)
      if (!entry) return 0n

      if (typeof entry.value?.uint !== 'undefined') {
        return BigInt(entry.value.uint)
      }

      if (entry.value?.bytes) {
        const raw = entry.value.bytes
        const bufferSource = (globalThis as any)?.Buffer
        if (bufferSource) {
          const buf = bufferSource.from(raw, 'base64')
          return BigInt('0x' + buf.toString('hex'))
        }
        if (typeof window !== 'undefined' && typeof window.atob === 'function') {
          const decoded = window.atob(raw)
          const result = decoded
            .split('')
            .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('')
          return result ? BigInt('0x' + result) : 0n
        }
      }

      return 0n
    }

    return {
      totalStaked: getValue('total_staked'),
      rewardRate: getValue('reward_rate'),
      rewardsPerShare: getValue('rewards_per_share'),
      lastUpdateTime: getValue('last_update_time'),
    }
  }

  async getPendingRewards(address: string) {
    const [stakeInfo, globalState] = await Promise.all([
      this.getStakeInfo(address),
      this.getGlobalState(),
    ])

    const now = BigInt(Math.floor(Date.now() / 1000))
    let effectiveRewardsPerShare = globalState.rewardsPerShare

    if (globalState.totalStaked > 0n && now > globalState.lastUpdateTime) {
      const timeDiff = now - globalState.lastUpdateTime
      const rewardAmount = timeDiff * globalState.rewardRate
      effectiveRewardsPerShare += (rewardAmount * PRECISION) / globalState.totalStaked
    }

    let pendingRewards = 0n
    if (stakeInfo.amount > 0n) {
      const accumulated = (stakeInfo.amount * effectiveRewardsPerShare) / PRECISION
      pendingRewards = accumulated > stakeInfo.rewardDebt ? accumulated - stakeInfo.rewardDebt : 0n
    }

    return {
      pendingRewards,
      stakeAmount: stakeInfo.amount,
      rewardDebt: stakeInfo.rewardDebt,
      totalStaked: globalState.totalStaked,
      rewardRate: globalState.rewardRate,
      rewardsPerShare: effectiveRewardsPerShare,
      lastUpdateTime: globalState.lastUpdateTime,
    }
  }
}
