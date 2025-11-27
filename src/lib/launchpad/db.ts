import { randomBytes } from 'crypto'
import type {
  LaunchProject,
  TokenPurchase,
  LaunchpadPoints,
  LaunchpadClaim,
  AntiBotRecord,
  PriceQuote,
  BondingCurveParams,
  CurveType,
  ProjectStatus
} from './types'
import {
  calculateProgress,
  calculateEarlyBonus,
  BLOCKS_PER_DAY,
  MAX_PURCHASE_PER_TX_PERCENT,
  MAX_PURCHASE_PER_USER_PERCENT,
  COOLDOWN_BLOCKS,
  POINTS_MULTIPLIER_BASE
} from './types'

// Lazy-load libsql client for Turso
let clientPromise: Promise<any> | null = null
async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL
      const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_DB_AUTH_TOKEN
      if (!url) {
        throw new Error('TURSO_DATABASE_URL is not set. Please configure Turso database in Vercel environment variables.')
      }
      const mod: any = await import('@libsql/client')
      return mod.createClient({ url, authToken })
    })()
  }
  return clientPromise
}

// Initialize database tables
let initPromise: Promise<void> | null = null
async function ensureInit() {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const client = await getClient()
    const fs = await import('fs')
    const path = await import('path')

    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'launchpad', 'schema.sql')

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8')
      const statements = schema.split(';').filter(s => s.trim())
      for (const statement of statements) {
        if (statement.trim()) {
          await client.execute(statement.trim())
        }
      }
    }
  })()
  return initPromise
}

// Project Management
export async function createProject(project: Omit<LaunchProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  await ensureInit()
  const client = await getClient()
  const projectId = `project_${Date.now()}_${randomBytes(4).toString('hex')}`

  await client.execute({
    sql: `INSERT INTO launch_projects (
      id, creator_address, token_name, token_symbol, token_decimals, total_supply,
      description, logo_url, website_url, twitter_url, telegram_url,
      curve_type, base_price, max_price, bonding_target, tokens_for_sale,
      liquidity_percentage, lp_lock_duration, dex_platform, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      projectId,
      project.creatorAddress,
      project.tokenName,
      project.tokenSymbol,
      project.tokenDecimals,
      project.totalSupply.toString(),
      project.description || null,
      project.logoUrl || null,
      project.websiteUrl || null,
      project.twitterUrl || null,
      project.telegramUrl || null,
      project.curveType,
      project.basePrice.toString(),
      project.maxPrice.toString(),
      project.bondingTarget.toString(),
      project.tokensForSale.toString(),
      project.liquidityPercentage,
      project.lpLockDuration.toString(),
      project.dexPlatform,
      project.status
    ]
  })

  return projectId
}

export async function getProject(projectId: string): Promise<LaunchProject | null> {
  await ensureInit()
  const client = await getClient()
  const { rows } = await client.execute({
    sql: 'SELECT * FROM launch_projects WHERE id = ?',
    args: [projectId]
  })

  const row: any = rows[0]
  if (!row) return null

  return {
    id: row.id,
    creatorAddress: row.creator_address,
    tokenName: row.token_name,
    tokenSymbol: row.token_symbol,
    tokenDecimals: row.token_decimals,
    totalSupply: BigInt(row.total_supply),
    description: row.description,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    twitterUrl: row.twitter_url,
    telegramUrl: row.telegram_url,
    asaId: row.asa_id ? BigInt(row.asa_id) : undefined,
    appId: row.app_id ? BigInt(row.app_id) : undefined,
    curveType: row.curve_type as CurveType,
    basePrice: BigInt(row.base_price),
    maxPrice: BigInt(row.max_price),
    bondingTarget: BigInt(row.bonding_target),
    tokensForSale: BigInt(row.tokens_for_sale),
    status: row.status as ProjectStatus,
    tokensSold: BigInt(row.tokens_sold),
    algoRaised: BigInt(row.algo_raised),
    participantCount: row.participant_count,
    launchRound: row.launch_round ? BigInt(row.launch_round) : undefined,
    graduationRound: row.graduation_round ? BigInt(row.graduation_round) : undefined,
    liquidityPercentage: row.liquidity_percentage,
    lpLockDuration: BigInt(row.lp_lock_duration),
    dexPlatform: row.dex_platform,
    createdAt: row.created_at,
    launchedAt: row.launched_at,
    graduatedAt: row.graduated_at,
    updatedAt: row.updated_at
  }
}

export async function getAllProjects(status?: ProjectStatus): Promise<LaunchProject[]> {
  await ensureInit()
  const client = await getClient()

  const { rows } = status
    ? await client.execute({ sql: 'SELECT * FROM launch_projects WHERE status = ? ORDER BY created_at DESC', args: [status] })
    : await client.execute('SELECT * FROM launch_projects ORDER BY created_at DESC')

  return rows.map((row: { id: any; creator_address: any; token_name: any; token_symbol: any; token_decimals: any; total_supply: string | number | bigint | boolean; description: any; logo_url: any; website_url: any; twitter_url: any; telegram_url: any; asa_id: string | number | bigint | boolean; app_id: string | number | bigint | boolean; curve_type: string; base_price: string | number | bigint | boolean; max_price: string | number | bigint | boolean; bonding_target: string | number | bigint | boolean; tokens_for_sale: string | number | bigint | boolean; status: string; tokens_sold: string | number | bigint | boolean; algo_raised: string | number | bigint | boolean; participant_count: any; launch_round: string | number | bigint | boolean; graduation_round: string | number | bigint | boolean; liquidity_percentage: any; lp_lock_duration: string | number | bigint | boolean; dex_platform: any; created_at: any; launched_at: any; graduated_at: any; updated_at: any }) => ({
    id: row.id,
    creatorAddress: row.creator_address,
    tokenName: row.token_name,
    tokenSymbol: row.token_symbol,
    tokenDecimals: row.token_decimals,
    totalSupply: BigInt(row.total_supply),
    description: row.description,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    twitterUrl: row.twitter_url,
    telegramUrl: row.telegram_url,
    asaId: row.asa_id ? BigInt(row.asa_id) : undefined,
    appId: row.app_id ? BigInt(row.app_id) : undefined,
    curveType: row.curve_type as CurveType,
    basePrice: BigInt(row.base_price),
    maxPrice: BigInt(row.max_price),
    bondingTarget: BigInt(row.bonding_target),
    tokensForSale: BigInt(row.tokens_for_sale),
    status: row.status as ProjectStatus,
    tokensSold: BigInt(row.tokens_sold),
    algoRaised: BigInt(row.algo_raised),
    participantCount: row.participant_count,
    launchRound: row.launch_round ? BigInt(row.launch_round) : undefined,
    graduationRound: row.graduation_round ? BigInt(row.graduation_round) : undefined,
    liquidityPercentage: row.liquidity_percentage,
    lpLockDuration: BigInt(row.lp_lock_duration),
    dexPlatform: row.dex_platform,
    createdAt: row.created_at,
    launchedAt: row.launched_at,
    graduatedAt: row.graduated_at,
    updatedAt: row.updated_at
  }))
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus, additionalData?: any): Promise<void> {
  await ensureInit()
  const client = await getClient()

  await client.execute({
    sql: 'UPDATE launch_projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [status, projectId]
  })

  if (additionalData) {
    if (additionalData.asaId) {
      await client.execute({
        sql: 'UPDATE launch_projects SET asa_id = ? WHERE id = ?',
        args: [additionalData.asaId.toString(), projectId]
      })
    }
    if (additionalData.appId) {
      await client.execute({
        sql: 'UPDATE launch_projects SET app_id = ? WHERE id = ?',
        args: [additionalData.appId.toString(), projectId]
      })
    }
    if (additionalData.launchRound) {
      await client.execute({
        sql: 'UPDATE launch_projects SET launch_round = ?, launched_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [additionalData.launchRound.toString(), projectId]
      })
    }
    if (additionalData.graduationRound) {
      await client.execute({
        sql: 'UPDATE launch_projects SET graduation_round = ?, graduated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [additionalData.graduationRound.toString(), projectId]
      })
    }
  }
}

// Bonding Curve Calculations
export function calculateSigmoidPrice(params: BondingCurveParams): bigint {
  const { basePrice, maxPrice, totalSupply, tokensSold } = params

  // Progress as percentage * 100 (0-10000)
  const progress = (tokensSold * 10000n) / totalSupply

  // Simplified sigmoid: price = base + (max - base) * (progress / 10000)^2
  const priceIncrease = (progress * progress) / 10000n
  const priceDelta = ((maxPrice - basePrice) * priceIncrease) / 10000n

  return basePrice + priceDelta
}

export function calculateLinearPrice(params: BondingCurveParams): bigint {
  const { basePrice, maxPrice, totalSupply, tokensSold } = params

  const progress = (tokensSold * 10000n) / totalSupply
  const priceDelta = ((maxPrice - basePrice) * progress) / 10000n

  return basePrice + priceDelta
}

export function calculateExponentialPrice(params: BondingCurveParams): bigint {
  const { basePrice, maxPrice, totalSupply, tokensSold } = params

  const progress = (tokensSold * 10000n) / totalSupply

  // Exponential: price = base * (max/base)^(progress/10000)
  // Simplified for TEAL compatibility
  const ratio = (maxPrice * 10000n) / basePrice
  const expFactor = (ratio * progress) / 10000n

  return (basePrice * expFactor) / 10000n
}

export function calculatePrice(params: BondingCurveParams): bigint {
  switch (params.curveType) {
    case 'sigmoid':
      return calculateSigmoidPrice(params)
    case 'linear':
      return calculateLinearPrice(params)
    case 'exponential':
      return calculateExponentialPrice(params)
    default:
      return calculateLinearPrice(params)
  }
}

export async function getPriceQuote(projectId: string, tokensAmount: bigint): Promise<PriceQuote | null> {
  const project = await getProject(projectId)
  if (!project) return null

  const currentPrice = calculatePrice({
    curveType: project.curveType,
    basePrice: project.basePrice,
    maxPrice: project.maxPrice,
    totalSupply: project.tokensForSale,
    tokensSold: project.tokensSold
  })

  // Calculate total cost (simplified - should integrate for accurate pricing)
  const totalCost = (tokensAmount * currentPrice) / BigInt(10 ** project.tokenDecimals)

  // Calculate price impact
  const priceAfter = calculatePrice({
    curveType: project.curveType,
    basePrice: project.basePrice,
    maxPrice: project.maxPrice,
    totalSupply: project.tokensForSale,
    tokensSold: project.tokensSold + tokensAmount
  })

  const priceImpact = Number((priceAfter - currentPrice) * 10000n / currentPrice) / 100

  // Calculate points with early bonus
  const progress = calculateProgress(project.tokensSold, project.tokensForSale)
  const earlyBonus = calculateEarlyBonus(progress)
  const pointsToEarn = BigInt(Math.floor(Number(tokensAmount) * earlyBonus))

  return {
    tokensAmount,
    totalCost,
    averagePrice: currentPrice,
    priceImpact,
    pointsToEarn
  }
}

// Purchase Management
export async function recordPurchase(
  projectId: string,
  buyerAddress: string,
  tokensAmount: bigint,
  algoPaid: bigint,
  transactionId: string,
  blockRound: bigint
): Promise<string> {
  await ensureInit()
  const client = await getClient()
  const project = await getProject(projectId)

  if (!project) throw new Error('Project not found')

  const purchaseId = `purchase_${Date.now()}_${randomBytes(4).toString('hex')}`

  const currentPrice = calculatePrice({
    curveType: project.curveType,
    basePrice: project.basePrice,
    maxPrice: project.maxPrice,
    totalSupply: project.tokensForSale,
    tokensSold: project.tokensSold
  })

  const progress = calculateProgress(project.tokensSold, project.tokensForSale)
  const earlyBonus = calculateEarlyBonus(progress)
  const pointsEarned = BigInt(Math.floor(Number(tokensAmount) * earlyBonus))

  // Record purchase
  await client.execute({
    sql: `INSERT INTO token_purchases (
      id, project_id, buyer_address, tokens_amount, algo_paid,
      price_per_token, points_earned, transaction_id, block_round
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      purchaseId,
      projectId,
      buyerAddress,
      tokensAmount.toString(),
      algoPaid.toString(),
      currentPrice.toString(),
      pointsEarned.toString(),
      transactionId,
      blockRound.toString()
    ]
  })

  // Update project stats
  const newTokensSold = project.tokensSold + tokensAmount
  const newAlgoRaised = project.algoRaised + algoPaid

  await client.execute({
    sql: 'UPDATE launch_projects SET tokens_sold = ?, algo_raised = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [newTokensSold.toString(), newAlgoRaised.toString(), projectId]
  })

  // Update or create points record
  const { rows: existingPointsRows } = await client.execute({
    sql: 'SELECT * FROM launchpad_points WHERE user_address = ? AND project_id = ?',
    args: [buyerAddress, projectId]
  })

  if (existingPointsRows.length > 0) {
    await client.execute({
      sql: 'UPDATE launchpad_points SET points_balance = points_balance + ?, total_earned = total_earned + ?, updated_at = CURRENT_TIMESTAMP WHERE user_address = ? AND project_id = ?',
      args: [pointsEarned.toString(), pointsEarned.toString(), buyerAddress, projectId]
    })
  } else {
    await client.execute({
      sql: 'INSERT INTO launchpad_points (user_address, project_id, points_balance, total_earned) VALUES (?, ?, ?, ?)',
      args: [buyerAddress, projectId, pointsEarned.toString(), pointsEarned.toString()]
    })

    // Increment participant count
    await client.execute({
      sql: 'UPDATE launch_projects SET participant_count = participant_count + 1 WHERE id = ?',
      args: [projectId]
    })
  }

  // Update anti-bot record
  const { rows: antibotRows } = await client.execute({
    sql: 'SELECT * FROM launchpad_antibot WHERE user_address = ? AND project_id = ?',
    args: [buyerAddress, projectId]
  })

  if (antibotRows.length > 0) {
    await client.execute({
      sql: 'UPDATE launchpad_antibot SET purchase_count = purchase_count + 1, last_purchase_round = ?, total_tokens_bought = total_tokens_bought + ?, updated_at = CURRENT_TIMESTAMP WHERE user_address = ? AND project_id = ?',
      args: [blockRound.toString(), tokensAmount.toString(), buyerAddress, projectId]
    })
  } else {
    await client.execute({
      sql: 'INSERT INTO launchpad_antibot (user_address, project_id, purchase_count, last_purchase_round, total_tokens_bought) VALUES (?, ?, 1, ?, ?)',
      args: [buyerAddress, projectId, blockRound.toString(), tokensAmount.toString()]
    })
  }

  return purchaseId
}

// Anti-Bot Checks
export async function validatePurchase(
  projectId: string,
  buyerAddress: string,
  tokensAmount: bigint,
  currentRound: bigint
): Promise<{ valid: boolean; reason?: string }> {
  await ensureInit()
  const client = await getClient()
  const project = await getProject(projectId)

  if (!project) return { valid: false, reason: 'Project not found' }
  if (project.status !== 'active') return { valid: false, reason: 'Project not active' }

  // Check if enough tokens available
  if (project.tokensSold + tokensAmount > project.tokensForSale) {
    return { valid: false, reason: 'Insufficient tokens available' }
  }

  // Check per-transaction limit (1% of total supply)
  const maxPerTx = (project.tokensForSale * BigInt(MAX_PURCHASE_PER_TX_PERCENT)) / 100n
  if (tokensAmount > maxPerTx) {
    return { valid: false, reason: `Maximum ${MAX_PURCHASE_PER_TX_PERCENT}% per transaction` }
  }

  // Get anti-bot record
  const { rows: antibotRows } = await client.execute({
    sql: 'SELECT * FROM launchpad_antibot WHERE user_address = ? AND project_id = ?',
    args: [buyerAddress, projectId]
  })

  if (antibotRows.length > 0) {
    const antibotRecord: any = antibotRows[0]
    // Check cooldown period
    if (antibotRecord.last_purchase_round) {
      const lastRound = BigInt(antibotRecord.last_purchase_round)
      if (currentRound < lastRound + COOLDOWN_BLOCKS) {
        return { valid: false, reason: 'Cooldown period active' }
      }
    }

    // Check per-user limit (5% of total supply)
    const maxPerUser = (project.tokensForSale * BigInt(MAX_PURCHASE_PER_USER_PERCENT)) / 100n
    const totalAfterPurchase = BigInt(antibotRecord.total_tokens_bought) + tokensAmount
    if (totalAfterPurchase > maxPerUser) {
      return { valid: false, reason: `Maximum ${MAX_PURCHASE_PER_USER_PERCENT}% per address` }
    }

    // Check if flagged as bot
    if (antibotRecord.flagged_as_bot) {
      return { valid: false, reason: 'Address flagged for suspicious activity' }
    }
  }

  return { valid: true }
}

export async function getUserPoints(userAddress: string, projectId: string): Promise<LaunchpadPoints | null> {
  await ensureInit()
  const client = await getClient()
  const { rows } = await client.execute({
    sql: 'SELECT * FROM launchpad_points WHERE user_address = ? AND project_id = ?',
    args: [userAddress, projectId]
  })

  const row: any = rows[0]
  if (!row) return null

  return {
    userAddress: row.user_address,
    projectId: row.project_id,
    pointsBalance: BigInt(row.points_balance),
    totalEarned: BigInt(row.total_earned),
    totalClaimed: BigInt(row.total_claimed),
    lastClaimRound: row.last_claim_round ? BigInt(row.last_claim_round) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function getPurchaseHistory(projectId: string, buyerAddress?: string): Promise<TokenPurchase[]> {
  await ensureInit()
  const client = await getClient()

  const { rows } = buyerAddress
    ? await client.execute({ sql: 'SELECT * FROM token_purchases WHERE project_id = ? AND buyer_address = ? ORDER BY timestamp DESC', args: [projectId, buyerAddress] })
    : await client.execute({ sql: 'SELECT * FROM token_purchases WHERE project_id = ? ORDER BY timestamp DESC', args: [projectId] })

  return rows.map((row: { id: any; project_id: any; buyer_address: any; tokens_amount: string | number | bigint | boolean; algo_paid: string | number | bigint | boolean; price_per_token: string | number | bigint | boolean; points_earned: string | number | bigint | boolean; transaction_id: any; block_round: string | number | bigint | boolean; timestamp: any }) => ({
    id: row.id,
    projectId: row.project_id,
    buyerAddress: row.buyer_address,
    tokensAmount: BigInt(row.tokens_amount),
    algoPaid: BigInt(row.algo_paid),
    pricePerToken: BigInt(row.price_per_token),
    pointsEarned: BigInt(row.points_earned),
    transactionId: row.transaction_id,
    blockRound: BigInt(row.block_round),
    timestamp: row.timestamp
  }))
}
