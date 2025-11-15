import { NextResponse } from "next/server"
import { getRuleById, createLog, incrementAgentTrade, type LogEntry } from "@/lib/db"
import { getAgent } from "@/lib/agent"
import type { AlgorandAsset } from "@/lib/algorand"
import algosdk from "algosdk"
import { buildUserAgentWallet } from "@/lib/agent-wallet"

export const runtime = "nodejs"

function getBaseUrl(req: Request) {
  const host = req.headers.get('host') || 'localhost:3000'
  const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1')
  const protocol = isLocal ? 'http' : 'https'
  return `${protocol}://${host}`
}

function generateId(prefix: string) {
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now()}_${rnd}`
}


export async function POST(req: Request) {
  let loadedRule: any = null
  try {
    const body = (await req.json().catch(() => ({}))) as unknown
    const ruleId = (typeof body === 'object' && body && 'ruleId' in body) ? (body as { ruleId?: string }).ruleId : undefined
    if (!ruleId || typeof ruleId !== 'string') {
      console.debug('[POST /api/agent/execute] abort: missing ruleId', { body })
      return NextResponse.json({ success: false, error: 'Missing ruleId', code: 'MISSING_RULE_ID' }, { status: 400 })
    }

    const rule = await getRuleById(ruleId)
    loadedRule = rule
    if (!rule) {
      console.debug('[POST /api/agent/execute] abort: rule not found', { ruleId })
      return NextResponse.json({ success: false, error: 'Rule not found', code: 'RULE_NOT_FOUND' }, { status: 404 })
    }

    const targets: string[] = Array.isArray(rule.targets) ? rule.targets : []
    if (!targets.length) {
      console.debug('[POST /api/agent/execute] abort: no targets', { ruleId })
      return NextResponse.json({ success: false, error: 'No targets in rule', code: 'NO_TARGETS' }, { status: 400 })
    }
    const spendAmount = Number(rule.maxSpendUSD ?? 0)
    if (!(spendAmount > 0)) {
      console.debug('[POST /api/agent/execute] abort: invalid spend amount', { ruleId, spendAmount })
      return NextResponse.json({ success: false, error: 'Max spend must be > 0', code: 'INVALID_MAX_SPEND' }, { status: 400 })
    }

    // Map Coinranking IDs to Algorand asset symbols
    const coinrankingToAlgorandMap: Record<string, string> = {
      'razxDUgYGNAdQ': 'ALGO',  // Ethereum UUID → ALGO
      'Qwsogvtv82FCd': 'BTC',   // Bitcoin
      'aKzUVe4Hh_CON': 'GOETH', // GoEthereum testnet token
      'WcwrkfNI4FUAe': 'USDC',  // USDC
      'USDC': 'USDC',
      'usdc': 'USDC',
      // Add more mappings as needed
    }

    // Validate owner address
    const rawRecipient = typeof rule.ownerAddress === 'string' ? rule.ownerAddress.trim() : ''
    const normalizedRecipient = rawRecipient ? rawRecipient.toUpperCase() : ''
    if (!algosdk.isValidAddress(normalizedRecipient)) {
      throw new Error(`Rule owner address is not a valid Algorand address: ${rawRecipient || '<empty>'}`)
    }

    // Build user's personal agent wallet (NOT the shared agent!)
    const userAgent = await buildUserAgentWallet(normalizedRecipient)
    
    const firstTarget = targets[0]
    const assetSymbol = coinrankingToAlgorandMap[firstTarget] || firstTarget.toUpperCase()
    const assetInfo: AlgorandAsset | undefined = userAgent.assets[assetSymbol as keyof typeof userAgent.assets]
    if (!assetInfo) {
      throw new Error(`Unsupported asset for execution: ${assetSymbol}`)
    }
    
    // Auto opt-in to asset if not already opted in (for non-ALGO assets)
    if (assetInfo.id !== 0) {
      try {
        console.log(`🔄 Ensuring agent wallet is opted into ${assetSymbol} (asset ${assetInfo.id})`)
        await userAgent.optInToAsset(assetInfo.id)
        console.log(`✅ Agent wallet opted into ${assetSymbol}`)
      } catch (error: any) {
        // If already opted in, that's fine
        if (!error.message?.includes('Already opted in')) {
          console.error(`⚠️ Opt-in failed for ${assetSymbol}:`, error.message)
          // Don't throw - let the balance check below catch if there's a real problem
        }
      }
    }

    // Check that user's agent wallet has sufficient balance
    await ensureOwnerHasAssetBalance(userAgent.algodClient, userAgent.address, assetInfo, spendAmount)

    const amountStr = spendAmount.toString()

    // Execute transfer from user's agent wallet to owner's main wallet
    const swapResult = await userAgent.transfer({
      to: normalizedRecipient,
      assetId: assetInfo.id,
      amount: spendAmount,
      note: `AutoPilot Rule ${ruleId} execution`
    })
    const txHash = swapResult.txId

    const plan = {
      totalSpendAmount: spendAmount,
      assetSymbol,
      assetId: assetInfo.id,
      decimals: assetInfo.decimals,
      legs: [
        {
          coinId: firstTarget,
          symbol: assetSymbol,
          side: 'spend' as const,
          amount: spendAmount,
          decimals: assetInfo.decimals,
          assetId: assetInfo.id,
        },
      ],
    }

    const now = new Date().toISOString()
    const log: LogEntry = {
      id: generateId('log'),
      ownerAddress: rule.ownerAddress,
      ruleId: rule.id,
      action: 'execute_rule',
      details: { rule, plan, txHash, swap: swapResult.details },
      status: 'success',
      createdAt: now,
    }
    await createLog(log)

    // Track the successful trade in agent wallet stats
    try {
      await incrementAgentTrade(normalizedRecipient, spendAmount, true)
    } catch (statsError) {
      console.error('Failed to update agent wallet stats:', statsError)
      // Don't fail the execution if stats update fails
    }

    return NextResponse.json({ success: true, txHash, swap: swapResult.details, logEntry: log }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Execution failed'
    const statusCode = /insufficient balance|must be > 0|too small/i.test(msg) ? 400 : 500
    // Best-effort failure log
    if (loadedRule?.ownerAddress) {
      const now = new Date().toISOString()
      const failLog: LogEntry = {
        id: generateId('log'),
        ownerAddress: loadedRule.ownerAddress,
        ruleId: loadedRule.id,
        action: 'execute_rule',
        details: { error: msg },
        status: 'failed',
        createdAt: now,
      }
      try { 
        await createLog(failLog)
        // Track the failed trade in agent wallet stats
        await incrementAgentTrade(loadedRule.ownerAddress, 0, false)
      } catch {}
    }
    return NextResponse.json({ success: false, error: msg }, { status: statusCode })
  }
}

async function ensureOwnerHasAssetBalance(algodClient: algosdk.Algodv2, ownerAddress: string, asset: AlgorandAsset, requiredAmount: number) {
  const accountInfo = await algodClient.accountInformation(ownerAddress).do()

  if (asset.id === 0) {
    const totalMicro = BigInt(accountInfo.amount ?? 0)
    const minBalance = BigInt(accountInfo.minBalance ?? 0)
    const available = totalMicro - minBalance
    const requiredMicro = BigInt(Math.round(requiredAmount * 1_000_000))
    if (available < requiredMicro) {
      throw new Error(`Owner wallet lacks required ALGO. Available ${(Number(available) / 1_000_000).toFixed(6)} ALGO (after min balance), required ${requiredAmount} ALGO.`)
    }
    return
  }

  const ownerAssets = Array.isArray(accountInfo.assets) ? accountInfo.assets : []
  const holding = ownerAssets.find((assetHolding: any) => Number(assetHolding['asset-id'] ?? assetHolding.assetId) === asset.id)
  if (!holding) {
    throw new Error(`Owner wallet is not opted into asset ${asset.symbol} (${asset.id}).`)
  }

  const requiredUnits = BigInt(Math.round(requiredAmount * Math.pow(10, asset.decimals)))
  const ownedUnits = BigInt(holding.amount ?? 0)
  if (ownedUnits < requiredUnits) {
    const divisor = Math.pow(10, asset.decimals)
    throw new Error(`Owner wallet balance too low for ${asset.symbol}. Available ${(Number(ownedUnits) / divisor).toFixed(asset.decimals)} ${asset.symbol}, required ${requiredAmount} ${asset.symbol}.`)
  }
}
