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
  ProjectStatus,
  ProjectHolder,
  LaunchpadPurchaseRecord,
  UserPortfolioPosition
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

// Lazy-load libsql client for Turso or local SQLite
let clientPromise: Promise<any> | null = null
export async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL
      const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_DB_AUTH_TOKEN
      
      // Use local SQLite file for development if Turso is not configured
      const effectiveUrl = url || 'file:./data/launchpad.sqlite'
      
      if (!url) {
        console.warn('⚠ TURSO_DATABASE_URL not set. Using local SQLite database at ./data/launchpad.sqlite')
      }
      
      const mod: any = await import('@libsql/client')
      // Use intMode: 'bigint' to handle large integers safely
      return mod.createClient({ 
        url: effectiveUrl, 
        authToken: authToken || undefined,
        intMode: 'bigint'  // Return integers as BigInt to avoid overflow
      })
    })()
  }
  return clientPromise
}

// Helper to safely convert to BigInt (handles bigint, number, string)
function toBigInt(value: bigint | number | string | null | undefined): bigint {
  if (value === null || value === undefined) return 0n
  if (typeof value === 'bigint') return value
  return BigInt(value)
}

function toBigIntOrUndefined(value: bigint | number | string | null | undefined): bigint | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'bigint') return value
  return BigInt(value)
}

// Initialize database tables
let initPromise: Promise<void> | null = null
async function ensureInit() {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const client = await getClient()
    const fs = await import('fs')
    const path = await import('path')

    // Run base schema
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'launchpad', 'schema.sql')

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8')
      const statements = schema.split(';').filter(s => s.trim())
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await client.execute(statement.trim())
          } catch (error: any) {
            // Ignore errors for existing tables
            if (!error.message?.includes('already exists')) {
              console.error('Schema error:', error.message)
            }
          }
        }
      }
    }

    // Run migrations
    const migrationsPath = path.join(process.cwd(), 'src', 'lib', 'launchpad', 'migrations')
    if (fs.existsSync(migrationsPath)) {
      const migrationFiles = fs.readdirSync(migrationsPath)
        .filter(f => f.endsWith('.sql'))
        .sort()

      for (const file of migrationFiles) {
        const migrationSql = fs.readFileSync(path.join(migrationsPath, file), 'utf-8')
        const statements = migrationSql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'))

        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await client.execute(statement.trim())
            } catch (error: any) {
              // Ignore duplicate column errors
              if (!error.message?.includes('duplicate column name')) {
                console.error(`Migration ${file} error:`, error.message)
              }
            }
          }
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
      liquidity_percentage, lp_lock_duration, dex_platform, status,
      asa_id, app_id, config_tx_id, bootstrap_tx_id, funding_tx_id,
      max_buy_per_tx, max_buy_per_user, cooldown_blocks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      project.status,
      project.asaId?.toString() || null,
      project.appId?.toString() || null,
      project.configTxId || null,
      project.bootstrapTxId || null,
      project.fundingTxId || null,
      project.maxBuyPerTx?.toString() || null,
      project.maxBuyPerUser?.toString() || null,
      project.cooldownBlocks?.toString() || null
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
    tokenDecimals: Number(row.token_decimals),
    totalSupply: toBigInt(row.total_supply),
    description: row.description,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    twitterUrl: row.twitter_url,
    telegramUrl: row.telegram_url,
    asaId: toBigIntOrUndefined(row.asa_id),
    appId: toBigIntOrUndefined(row.app_id),
    configTxId: row.config_tx_id,
    bootstrapTxId: row.bootstrap_tx_id,
    fundingTxId: row.funding_tx_id,
    curveType: row.curve_type as CurveType,
    basePrice: toBigInt(row.base_price),
    maxPrice: toBigInt(row.max_price),
    bondingTarget: toBigInt(row.bonding_target),
    tokensForSale: toBigInt(row.tokens_for_sale),
    status: row.status as ProjectStatus,
    tokensSold: toBigInt(row.tokens_sold),
    algoRaised: toBigInt(row.algo_raised),
    participantCount: Number(row.participant_count || 0),
    launchRound: toBigIntOrUndefined(row.launch_round),
    graduationRound: toBigIntOrUndefined(row.graduation_round),
    liquidityPercentage: Number(row.liquidity_percentage || 0),
    lpLockDuration: toBigInt(row.lp_lock_duration),
    dexPlatform: row.dex_platform,
    maxBuyPerTx: toBigIntOrUndefined(row.max_buy_per_tx),
    maxBuyPerUser: toBigIntOrUndefined(row.max_buy_per_user),
    cooldownBlocks: toBigIntOrUndefined(row.cooldown_blocks),
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

  return rows.map((row: any) => ({
    id: row.id,
    creatorAddress: row.creator_address,
    tokenName: row.token_name,
    tokenSymbol: row.token_symbol,
    tokenDecimals: Number(row.token_decimals),
    totalSupply: toBigInt(row.total_supply),
    description: row.description,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    twitterUrl: row.twitter_url,
    telegramUrl: row.telegram_url,
    asaId: toBigIntOrUndefined(row.asa_id),
    appId: toBigIntOrUndefined(row.app_id),
    configTxId: row.config_tx_id,
    bootstrapTxId: row.bootstrap_tx_id,
    fundingTxId: row.funding_tx_id,
    curveType: row.curve_type as CurveType,
    basePrice: toBigInt(row.base_price),
    maxPrice: toBigInt(row.max_price),
    bondingTarget: toBigInt(row.bonding_target),
    tokensForSale: toBigInt(row.tokens_for_sale),
    status: row.status as ProjectStatus,
    tokensSold: toBigInt(row.tokens_sold),
    algoRaised: toBigInt(row.algo_raised),
    participantCount: Number(row.participant_count || 0),
    launchRound: toBigIntOrUndefined(row.launch_round),
    graduationRound: toBigIntOrUndefined(row.graduation_round),
    liquidityPercentage: Number(row.liquidity_percentage || 0),
    lpLockDuration: toBigInt(row.lp_lock_duration),
    dexPlatform: row.dex_platform,
    maxBuyPerTx: toBigIntOrUndefined(row.max_buy_per_tx),
    maxBuyPerUser: toBigIntOrUndefined(row.max_buy_per_user),
    cooldownBlocks: toBigIntOrUndefined(row.cooldown_blocks),
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

/**
 * Calculate the total cost for purchasing n tokens using the bonding curve.
 * This matches the smart contract's formula for linear curve:
 *   cost = p0*n + delta_p * n * (2*s + n) / (2 * tokens_for_sale)
 * Where:
 *   p0 = start_price (basePrice)
 *   p1 = target_price (maxPrice)
 *   delta_p = p1 - p0
 *   s = tokens_sold (current tokens sold)
 *   n = quantity to buy
 */
export function calculateLinearCurveCost(
  basePrice: bigint,
  maxPrice: bigint,
  tokensForSale: bigint,
  tokensSold: bigint,
  quantity: bigint
): bigint {
  const p0 = basePrice
  const deltaP = maxPrice - basePrice
  
  // cost = p0*n + delta_p * n * (2*s + n) / (2 * tokens_for_sale)
  const numerator = deltaP * quantity * ((tokensSold * 2n) + quantity)
  const denominator = tokensForSale * 2n
  const curveAdd = numerator / denominator
  const cost = p0 * quantity + curveAdd
  
  return cost
}

/**
 * Calculate the total cost for purchasing tokens based on curve type.
 * For linear curve, this integrates along the curve (not just spot price × quantity).
 */
export function calculateTotalCost(
  curveType: CurveType,
  basePrice: bigint,
  maxPrice: bigint,
  tokensForSale: bigint,
  tokensSold: bigint,
  quantity: bigint
): bigint {
  switch (curveType) {
    case 'linear':
      return calculateLinearCurveCost(basePrice, maxPrice, tokensForSale, tokensSold, quantity)
    case 'sigmoid':
    case 'exponential':
    default:
      // For now, use linear integration for all curve types
      // TODO: Add proper integration for sigmoid and exponential curves
      return calculateLinearCurveCost(basePrice, maxPrice, tokensForSale, tokensSold, quantity)
  }
}

/**
 * Calculate how many tokens you can buy for a given ALGO amount.
 * This is the inverse of calculateLinearCurveCost - solving for n given cost.
 * 
 * From: cost = p0*n + delta_p * n * (2*s + n) / (2 * T)
 * Rearranging: delta_p/(2T) * n^2 + (p0 + delta_p*s/T) * n - cost = 0
 * 
 * Using quadratic formula: n = (-b + sqrt(b^2 + 4ac)) / (2a)
 * Where:
 *   a = delta_p / (2*T)
 *   b = p0 + delta_p * s / T
 *   c = cost
 */
export function calculateTokensForAlgo(
  basePrice: bigint,
  maxPrice: bigint,
  tokensForSale: bigint,
  tokensSold: bigint,
  algoAmount: bigint  // in microALGO
): bigint {
  const p0 = basePrice
  const deltaP = maxPrice - basePrice
  const T = tokensForSale
  const s = tokensSold
  const cost = algoAmount
  
  // If deltaP is 0 (flat price), simple division
  if (deltaP === 0n) {
    return p0 > 0n ? cost / p0 : 0n
  }
  
  // For the quadratic formula, we need to work with scaled integers
  // a = deltaP / (2*T), b = p0 + deltaP*s/T
  // To avoid precision loss, multiply everything by 2*T
  // New equation: deltaP * n^2 + (2*T*p0 + 2*deltaP*s) * n - 2*T*cost = 0
  
  const a = deltaP
  const b = 2n * T * p0 + 2n * deltaP * s
  const c = 2n * T * cost
  
  // Discriminant: b^2 + 4*a*c (note: +4ac because we moved cost to other side)
  const discriminant = b * b + 4n * a * c
  
  // Integer square root using Newton's method
  const sqrtDiscriminant = bigIntSqrt(discriminant)
  
  // n = (-b + sqrt(discriminant)) / (2*a)
  // Since b is positive and we want positive n, use: (sqrt(discriminant) - b) / (2*a)
  // Wait, the original equation has -cost, so it's actually +4ac
  // n = (-b + sqrt(b^2 + 4ac)) / (2a)
  
  const numerator = sqrtDiscriminant - b
  const denominator = 2n * a
  
  // If numerator is negative, no valid solution (can't afford any tokens)
  if (numerator <= 0n) {
    return 0n
  }
  
  const tokens = numerator / denominator
  
  // Ensure we don't exceed available tokens
  const available = tokensForSale - tokensSold
  return tokens > available ? available : tokens
}

/**
 * Integer square root using Newton's method
 */
function bigIntSqrt(n: bigint): bigint {
  if (n < 0n) throw new Error('Square root of negative number')
  if (n === 0n) return 0n
  if (n === 1n) return 1n
  
  let x = n
  let y = (x + 1n) / 2n
  
  while (y < x) {
    x = y
    y = (x + n / x) / 2n
  }
  
  return x
}

/**
 * Get a price quote based on ALGO amount (how many tokens for X ALGO)
 */
export async function getQuoteForAlgo(projectId: string, algoAmount: bigint): Promise<PriceQuote | null> {
  const project = await getProject(projectId)
  if (!project) return null

  // Calculate how many tokens we can buy for this ALGO amount
  const tokensAmount = calculateTokensForAlgo(
    project.basePrice,
    project.maxPrice,
    project.tokensForSale,
    project.tokensSold,
    algoAmount
  )
  
  if (tokensAmount <= 0n) {
    return {
      tokensAmount: 0n,
      totalCost: 0n,
      averagePrice: project.basePrice,
      priceImpact: 0,
      pointsToEarn: 0n
    }
  }

  // Now get the actual cost for these tokens (should be close to algoAmount)
  const totalCost = calculateTotalCost(
    project.curveType,
    project.basePrice,
    project.maxPrice,
    project.tokensForSale,
    project.tokensSold,
    tokensAmount
  )

  const currentPrice = calculatePrice({
    curveType: project.curveType,
    basePrice: project.basePrice,
    maxPrice: project.maxPrice,
    totalSupply: project.tokensForSale,
    tokensSold: project.tokensSold
  })

  const priceAfter = calculatePrice({
    curveType: project.curveType,
    basePrice: project.basePrice,
    maxPrice: project.maxPrice,
    totalSupply: project.tokensForSale,
    tokensSold: project.tokensSold + tokensAmount
  })

  const priceImpact = currentPrice > 0n 
    ? Number((priceAfter - currentPrice) * 10000n / currentPrice) / 100
    : 0

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

  // Calculate total cost using proper integration along the bonding curve
  // This matches the smart contract's formula exactly
  const totalCost = calculateTotalCost(
    project.curveType,
    project.basePrice,
    project.maxPrice,
    project.tokensForSale,
    project.tokensSold,
    tokensAmount
  )

  // Calculate price impact
  const priceAfter = calculatePrice({
    curveType: project.curveType,
    basePrice: project.basePrice,
    maxPrice: project.maxPrice,
    totalSupply: project.tokensForSale,
    tokensSold: project.tokensSold + tokensAmount
  })

  const priceImpact = currentPrice > 0n 
    ? Number((priceAfter - currentPrice) * 10000n / currentPrice) / 100
    : 0

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

export async function getProjectHolders(projectId: string): Promise<ProjectHolder[]> {
  await ensureInit()
  const client = await getClient()

  const { rows } = await client.execute({
    sql: `SELECT buyer_address, SUM(tokens_amount) AS total_tokens, SUM(algo_paid) AS total_algo,
                 COUNT(*) AS purchase_count, MAX(timestamp) AS last_purchase
          FROM token_purchases
          WHERE project_id = ?
          GROUP BY buyer_address
          ORDER BY total_tokens DESC`,
    args: [projectId]
  })

  return rows.map((row: any) => ({
    buyerAddress: row.buyer_address,
    totalTokens: toBigInt(row.total_tokens ?? 0),
    totalAlgo: toBigInt(row.total_algo ?? 0),
    purchaseCount: Number(row.purchase_count ?? 0),
    lastPurchaseAt: row.last_purchase ?? null,
  }))
}

export async function getGlobalPurchases(options?: { projectId?: string; limit?: number; offset?: number }): Promise<LaunchpadPurchaseRecord[]> {
  await ensureInit()
  const client = await getClient()
  const limit = options?.limit ?? 100
  const offset = options?.offset ?? 0

  const baseSql = `SELECT tp.*, lp.token_name, lp.token_symbol, lp.token_decimals, lp.logo_url
    FROM token_purchases tp
    INNER JOIN launch_projects lp ON lp.id = tp.project_id
    ${options?.projectId ? 'WHERE tp.project_id = ?' : ''}
    ORDER BY datetime(tp.timestamp) DESC
    LIMIT ? OFFSET ?`

  const args = options?.projectId
    ? [options.projectId, limit, offset]
    : [limit, offset]

  const { rows } = await client.execute({ sql: baseSql, args })

  return rows.map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    buyerAddress: row.buyer_address,
    tokensAmount: BigInt(row.tokens_amount),
    algoPaid: BigInt(row.algo_paid),
    pricePerToken: BigInt(row.price_per_token),
    pointsEarned: BigInt(row.points_earned),
    transactionId: row.transaction_id,
    blockRound: BigInt(row.block_round),
    timestamp: row.timestamp,
    tokenName: row.token_name,
    tokenSymbol: row.token_symbol,
    tokenDecimals: Number(row.token_decimals ?? 6),
    logoUrl: row.logo_url ?? null,
  }))
}

export async function getUserPortfolio(userAddress: string): Promise<UserPortfolioPosition[]> {
  await ensureInit()
  const client = await getClient()

  const { rows } = await client.execute({
    sql: `SELECT tp.project_id, lp.token_name, lp.token_symbol, lp.token_decimals, lp.logo_url,
                 SUM(tp.tokens_amount) AS tokens_held,
                 SUM(tp.algo_paid) AS algo_spent,
                 COUNT(*) AS purchase_count,
                 MAX(tp.timestamp) AS last_purchase
          FROM token_purchases tp
          INNER JOIN launch_projects lp ON lp.id = tp.project_id
          WHERE tp.buyer_address = ?
          GROUP BY tp.project_id, lp.token_name, lp.token_symbol, lp.token_decimals, lp.logo_url
          ORDER BY datetime(last_purchase) DESC`,
    args: [userAddress]
  })

  return rows.map((row: any) => {
    const tokensHeld = toBigInt(row.tokens_held ?? 0)
    const algoSpent = toBigInt(row.algo_spent ?? 0)
    const averagePrice = tokensHeld > 0n ? algoSpent / tokensHeld : 0n

    return {
      projectId: row.project_id,
      tokenName: row.token_name,
      tokenSymbol: row.token_symbol,
      tokenDecimals: Number(row.token_decimals ?? 6),
      logoUrl: row.logo_url ?? null,
      tokensHeld,
      algoSpent,
      averagePrice,
      purchaseCount: Number(row.purchase_count ?? 0),
      lastPurchaseAt: row.last_purchase ?? null,
    }
  })
}