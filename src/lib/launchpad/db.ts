import { randomBytes } from 'crypto'
import type {
  LaunchProject,
  TokenPurchase,
  UserPoints,
  PriceQuote,
  AntiBotRecord,
  ProjectHolder,
  UserPortfolio,
  ProjectStatus,
  CurveType
} from './types'

// Lazy-load libsql client for Turso
let clientPromise: Promise<any> | null = null
export async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL
      const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_DB_AUTH_TOKEN
      if (!url) {
        throw new Error('TURSO_DATABASE_URL is not set. Please configure Turso database.')
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

    // Create launch_projects table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS launch_projects (
        id TEXT PRIMARY KEY,
        creator_address TEXT NOT NULL,
        token_name TEXT NOT NULL,
        token_symbol TEXT NOT NULL,
        token_decimals INTEGER DEFAULT 6,
        total_supply INTEGER NOT NULL,
        description TEXT,
        logo_url TEXT,
        website_url TEXT,
        twitter_url TEXT,
        telegram_url TEXT,
        curve_type TEXT DEFAULT 'sigmoid',
        base_price INTEGER NOT NULL,
        max_price INTEGER NOT NULL,
        bonding_target INTEGER NOT NULL,
        tokens_for_sale INTEGER NOT NULL,
        tokens_sold INTEGER DEFAULT 0,
        algo_raised INTEGER DEFAULT 0,
        participant_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        liquidity_percentage INTEGER DEFAULT 80,
        lp_lock_duration INTEGER NOT NULL,
        dex_platform TEXT DEFAULT 'tinyman',
        asa_id INTEGER,
        app_id INTEGER,
        config_tx_id TEXT,
        bootstrap_tx_id TEXT,
        funding_tx_id TEXT,
        launch_round INTEGER,
        graduation_round INTEGER,
        max_buy_per_tx INTEGER,
        max_buy_per_user INTEGER,
        cooldown_blocks INTEGER DEFAULT 10,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create token_purchases table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS token_purchases (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        buyer_address TEXT NOT NULL,
        tokens_amount INTEGER NOT NULL,
        algo_paid INTEGER NOT NULL,
        price_per_token INTEGER NOT NULL,
        points_earned INTEGER NOT NULL,
        transaction_id TEXT NOT NULL,
        block_round INTEGER NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES launch_projects(id)
      )
    `)

    // Create launchpad_points table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS launchpad_points (
        user_address TEXT NOT NULL,
        project_id TEXT NOT NULL,
        points_balance INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        total_claimed INTEGER DEFAULT 0,
        last_claim_round INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_address, project_id),
        FOREIGN KEY (project_id) REFERENCES launch_projects(id)
      )
    `)

    // Create launchpad_antibot table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS launchpad_antibot (
        user_address TEXT NOT NULL,
        project_id TEXT NOT NULL,
        purchase_count INTEGER DEFAULT 0,
        last_purchase_round INTEGER,
        total_tokens_bought INTEGER DEFAULT 0,
        flagged_as_bot INTEGER DEFAULT 0,
        whale_penalty INTEGER DEFAULT 0,
        PRIMARY KEY (user_address, project_id),
        FOREIGN KEY (project_id) REFERENCES launch_projects(id)
      )
    `)

    // Create indexes for better query performance
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_purchases_project ON token_purchases(project_id)`)
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON token_purchases(buyer_address)`)
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_projects_status ON launch_projects(status)`)
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_projects_creator ON launch_projects(creator_address)`)
  })()
  return initPromise
}

// Helper function to convert database row to LaunchProject
function rowToProject(row: any): LaunchProject {
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
    curveType: row.curve_type as CurveType,
    basePrice: BigInt(row.base_price),
    maxPrice: BigInt(row.max_price),
    bondingTarget: BigInt(row.bonding_target),
    tokensForSale: BigInt(row.tokens_for_sale),
    tokensSold: BigInt(row.tokens_sold),
    algoRaised: BigInt(row.algo_raised),
    participantCount: row.participant_count,
    status: row.status as ProjectStatus,
    liquidityPercentage: row.liquidity_percentage,
    lpLockDuration: BigInt(row.lp_lock_duration),
    dexPlatform: row.dex_platform,
    asaId: row.asa_id ? BigInt(row.asa_id) : undefined,
    appId: row.app_id ? BigInt(row.app_id) : undefined,
    configTxId: row.config_tx_id,
    bootstrapTxId: row.bootstrap_tx_id,
    fundingTxId: row.funding_tx_id,
    launchRound: row.launch_round ? BigInt(row.launch_round) : undefined,
    graduationRound: row.graduation_round ? BigInt(row.graduation_round) : undefined,
    maxBuyPerTx: row.max_buy_per_tx ? BigInt(row.max_buy_per_tx) : undefined,
    maxBuyPerUser: row.max_buy_per_user ? BigInt(row.max_buy_per_user) : undefined,
    cooldownBlocks: row.cooldown_blocks ? BigInt(row.cooldown_blocks) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Helper function to convert database row to TokenPurchase
function rowToPurchase(row: any): TokenPurchase {
  return {
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
  }
}

// Bonding curve price calculation functions
function calculateLinearPrice(progress: number, basePrice: bigint, maxPrice: bigint): bigint {
  const range = maxPrice - basePrice
  const increase = (range * BigInt(Math.floor(progress * 10000))) / 10000n
  return basePrice + increase
}

function calculateSigmoidPrice(progress: number, basePrice: bigint, maxPrice: bigint): bigint {
  const range = maxPrice - basePrice
  // Sigmoid: base + (max-base) * progress²
  const progressSquared = Math.floor(progress * progress * 10000)
  const increase = (range * BigInt(progressSquared)) / 10000n
  return basePrice + increase
}

function calculateExponentialPrice(progress: number, basePrice: bigint, maxPrice: bigint): bigint {
  const range = maxPrice - basePrice
  // Exponential: base + (max-base) * (e^(3*progress) - 1) / (e^3 - 1)
  const expValue = Math.exp(3 * progress)
  const expMax = Math.exp(3)
  const normalized = (expValue - 1) / (expMax - 1)
  const increase = (range * BigInt(Math.floor(normalized * 10000))) / 10000n
  return basePrice + increase
}

function getCurrentPrice(project: LaunchProject, tokensSold: bigint): bigint {
  const progress = Number(tokensSold) / Number(project.tokensForSale)
  
  switch (project.curveType) {
    case 'linear':
      return calculateLinearPrice(progress, project.basePrice, project.maxPrice)
    case 'exponential':
      return calculateExponentialPrice(progress, project.basePrice, project.maxPrice)
    case 'sigmoid':
    default:
      return calculateSigmoidPrice(progress, project.basePrice, project.maxPrice)
  }
}

// Project CRUD operations
export async function createProject(projectData: Omit<LaunchProject, 'id' | 'tokensSold' | 'algoRaised' | 'participantCount' | 'createdAt' | 'updatedAt'>): Promise<LaunchProject> {
  await ensureInit()
  const client = await getClient()
  
  const id = randomBytes(16).toString('hex')
  const now = new Date().toISOString()

  await client.execute({
    sql: `INSERT INTO launch_projects (
      id, creator_address, token_name, token_symbol, token_decimals, total_supply,
      description, logo_url, website_url, twitter_url, telegram_url,
      curve_type, base_price, max_price, bonding_target, tokens_for_sale,
      liquidity_percentage, lp_lock_duration, dex_platform,
      max_buy_per_tx, max_buy_per_user, cooldown_blocks, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      projectData.creatorAddress,
      projectData.tokenName,
      projectData.tokenSymbol,
      projectData.tokenDecimals,
      projectData.totalSupply.toString(),
      projectData.description || null,
      projectData.logoUrl || null,
      projectData.websiteUrl || null,
      projectData.twitterUrl || null,
      projectData.telegramUrl || null,
      projectData.curveType,
      projectData.basePrice.toString(),
      projectData.maxPrice.toString(),
      projectData.bondingTarget.toString(),
      projectData.tokensForSale.toString(),
      projectData.liquidityPercentage,
      projectData.lpLockDuration.toString(),
      projectData.dexPlatform,
      projectData.maxBuyPerTx?.toString() || null,
      projectData.maxBuyPerUser?.toString() || null,
      projectData.cooldownBlocks?.toString() || '10',
      projectData.status,
      now,
      now,
    ]
  })

  const result = await client.execute({
    sql: 'SELECT * FROM launch_projects WHERE id = ?',
    args: [id]
  })

  return rowToProject(result.rows[0])
}

export async function getProject(projectId: string): Promise<LaunchProject | null> {
  await ensureInit()
  const client = await getClient()

  const result = await client.execute({
    sql: 'SELECT * FROM launch_projects WHERE id = ?',
    args: [projectId]
  })

  if (result.rows.length === 0) return null
  return rowToProject(result.rows[0])
}

export async function getAllProjects(status?: ProjectStatus): Promise<LaunchProject[]> {
  await ensureInit()
  const client = await getClient()

  const result = status
    ? await client.execute({
        sql: 'SELECT * FROM launch_projects WHERE status = ? ORDER BY created_at DESC',
        args: [status]
      })
    : await client.execute('SELECT * FROM launch_projects ORDER BY created_at DESC')

  return result.rows.map(rowToProject)
}

export async function updateProject(projectId: string, updates: Partial<LaunchProject>): Promise<LaunchProject | null> {
  await ensureInit()
  const client = await getClient()
  
  const setClauses: string[] = []
  const values: any[] = []

  // Map updates to database columns
  if (updates.tokensSold !== undefined) {
    setClauses.push('tokens_sold = ?')
    values.push(updates.tokensSold.toString())
  }
  if (updates.algoRaised !== undefined) {
    setClauses.push('algo_raised = ?')
    values.push(updates.algoRaised.toString())
  }
  if (updates.participantCount !== undefined) {
    setClauses.push('participant_count = ?')
    values.push(updates.participantCount)
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?')
    values.push(updates.status)
  }
  if (updates.asaId !== undefined) {
    setClauses.push('asa_id = ?')
    values.push(updates.asaId.toString())
  }
  if (updates.appId !== undefined) {
    setClauses.push('app_id = ?')
    values.push(updates.appId.toString())
  }
  if (updates.graduationRound !== undefined) {
    setClauses.push('graduation_round = ?')
    values.push(updates.graduationRound.toString())
  }

  if (setClauses.length === 0) return getProject(projectId)

  setClauses.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(projectId)

  await client.execute({
    sql: `UPDATE launch_projects SET ${setClauses.join(', ')} WHERE id = ?`,
    args: values
  })

  return getProject(projectId)
}

// Purchase operations
export async function getPurchaseHistory(projectId: string, buyerAddress?: string): Promise<TokenPurchase[]> {
  await ensureInit()
  const client = await getClient()

  const result = buyerAddress
    ? await client.execute({
        sql: 'SELECT * FROM token_purchases WHERE project_id = ? AND buyer_address = ? ORDER BY timestamp DESC',
        args: [projectId, buyerAddress]
      })
    : await client.execute({
        sql: 'SELECT * FROM token_purchases WHERE project_id = ? ORDER BY timestamp DESC',
        args: [projectId]
      })

  return result.rows.map(rowToPurchase)
}

export async function getGlobalPurchases(filters?: {
  projectId?: string
  limit?: number
  offset?: number
}): Promise<TokenPurchase[]> {
  await ensureInit()
  const client = await getClient()

  let sql = 'SELECT * FROM token_purchases'
  const args: any[] = []

  if (filters?.projectId) {
    sql += ' WHERE project_id = ?'
    args.push(filters.projectId)
  }

  sql += ' ORDER BY timestamp DESC'

  if (filters?.limit) {
    sql += ' LIMIT ?'
    args.push(filters.limit)
  }

  if (filters?.offset) {
    sql += ' OFFSET ?'
    args.push(filters.offset)
  }

  const result = await client.execute({ sql, args })
  return result.rows.map(rowToPurchase)
}

export async function getProjectHolders(projectId: string): Promise<ProjectHolder[]> {
  await ensureInit()
  const client = await getClient()

  const result = await client.execute({
    sql: `
      SELECT 
        buyer_address,
        SUM(tokens_amount) as total_tokens,
        SUM(algo_paid) as total_algo,
        COUNT(*) as purchase_count,
        MAX(timestamp) as last_purchase_at
      FROM token_purchases
      WHERE project_id = ?
      GROUP BY buyer_address
      ORDER BY total_tokens DESC
    `,
    args: [projectId]
  })

  return result.rows.map((row: any) => ({
    buyerAddress: row.buyer_address,
    totalTokens: BigInt(row.total_tokens),
    totalAlgo: BigInt(row.total_algo),
    purchaseCount: row.purchase_count,
    lastPurchaseAt: row.last_purchase_at
  }))
}

// Price quote functions
export async function getPriceQuote(projectId: string, tokensAmount: bigint): Promise<PriceQuote | null> {
  const project = await getProject(projectId)
  if (!project) return null

  const startingSold = project.tokensSold
  const endingSold = startingSold + tokensAmount

  if (endingSold > project.tokensForSale) {
    throw new Error('Insufficient tokens available')
  }

  // Calculate total cost using integral of bonding curve
  let totalCost = 0n
  const steps = 100 // Number of steps for integration
  const stepSize = tokensAmount / BigInt(steps)

  for (let i = 0; i < steps; i++) {
    const currentSold = startingSold + stepSize * BigInt(i)
    const price = getCurrentPrice(project, currentSold)
    totalCost += price * stepSize
  }

  // Convert from per-token to total (divide by 10^decimals)
  totalCost = totalCost / BigInt(10 ** project.tokenDecimals)

  const averagePrice = totalCost / tokensAmount * BigInt(10 ** project.tokenDecimals)
  const startPrice = getCurrentPrice(project, startingSold)
  const priceImpact = Number((averagePrice - startPrice) * 10000n / startPrice) / 100

  // Calculate points with early buyer bonus
  const progress = Number(startingSold) / Number(project.tokensForSale)
  const earlyBonus = progress < 0.1 ? 1.5 : progress < 0.25 ? 1.3 : progress < 0.5 ? 1.1 : 1.0
  const basePoints = totalCost / 1000n // 1 point per 1000 microALGO (0.001 ALGO)
  const pointsToEarn = BigInt(Math.floor(Number(basePoints) * earlyBonus))

  return {
    tokensAmount,
    totalCost,
    averagePrice,
    priceImpact,
    pointsToEarn
  }
}

export async function getQuoteForAlgo(projectId: string, algoAmount: bigint): Promise<PriceQuote | null> {
  const project = await getProject(projectId)
  if (!project) return null

  // Binary search to find how many tokens can be bought with the ALGO amount
  let low = 0n
  let high = project.tokensForSale - project.tokensSold
  let bestTokens = 0n
  let bestQuote: PriceQuote | null = null

  while (low <= high) {
    const mid = (low + high) / 2n
    try {
      const quote = await getPriceQuote(projectId, mid)
      if (!quote) break

      if (quote.totalCost <= algoAmount) {
        bestTokens = mid
        bestQuote = quote
        low = mid + 1n
      } else {
        high = mid - 1n
      }
    } catch {
      high = mid - 1n
    }
  }

  return bestQuote
}

// Purchase validation and recording
export async function validatePurchase(
  projectId: string,
  buyerAddress: string,
  tokensAmount: bigint,
  currentRound: bigint
): Promise<{ valid: boolean; error?: string }> {
  await ensureInit()
  const client = await getClient()
  const project = await getProject(projectId)

  if (!project) {
    return { valid: false, error: 'Project not found' }
  }

  if (project.status !== 'active') {
    return { valid: false, error: 'Project is not active' }
  }

  // Check if sufficient tokens available
  if (project.tokensSold + tokensAmount > project.tokensForSale) {
    return { valid: false, error: 'Insufficient tokens available' }
  }

  // Check per-transaction limit (e.g., 1% of total supply)
  if (project.maxBuyPerTx && tokensAmount > project.maxBuyPerTx) {
    return { valid: false, error: `Exceeds max buy per transaction: ${project.maxBuyPerTx}` }
  }

  // Get anti-bot record
  const antibotResult = await client.execute({
    sql: 'SELECT * FROM launchpad_antibot WHERE user_address = ? AND project_id = ?',
    args: [buyerAddress, projectId]
  })

  if (antibotResult.rows.length > 0) {
    const antibot = antibotResult.rows[0] as any

    // Check if flagged as bot
    if (antibot.flagged_as_bot) {
      return { valid: false, error: 'Address flagged for suspicious activity' }
    }

    // Check cooldown (e.g., 10 blocks between purchases)
    if (antibot.last_purchase_round && project.cooldownBlocks) {
      const blocksSince = currentRound - BigInt(antibot.last_purchase_round)
      if (blocksSince < project.cooldownBlocks) {
        return { valid: false, error: `Cooldown active. Wait ${project.cooldownBlocks - blocksSince} more blocks` }
      }
    }

    // Check per-user limit (e.g., 5% of total supply)
    if (project.maxBuyPerUser) {
      const totalAfter = BigInt(antibot.total_tokens_bought) + tokensAmount
      if (totalAfter > project.maxBuyPerUser) {
        return { valid: false, error: `Exceeds max buy per user: ${project.maxBuyPerUser}` }
      }
    }
  }

  return { valid: true }
}

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
  
  const purchaseId = randomBytes(16).toString('hex')
  const pricePerToken = (algoPaid * BigInt(10 ** 6)) / tokensAmount

  // Calculate points
  const quote = await getPriceQuote(projectId, tokensAmount)
  const pointsEarned = quote?.pointsToEarn || 0n

  // Insert purchase record
  await client.execute({
    sql: `INSERT INTO token_purchases (
      id, project_id, buyer_address, tokens_amount, algo_paid, price_per_token,
      points_earned, transaction_id, block_round, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      purchaseId,
      projectId,
      buyerAddress,
      tokensAmount.toString(),
      algoPaid.toString(),
      pricePerToken.toString(),
      pointsEarned.toString(),
      transactionId,
      blockRound.toString(),
      new Date().toISOString()
    ]
  })

  // Update or create user points
  const pointsResult = await client.execute({
    sql: 'SELECT * FROM launchpad_points WHERE user_address = ? AND project_id = ?',
    args: [buyerAddress, projectId]
  })

  if (pointsResult.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO launchpad_points (user_address, project_id, points_balance, total_earned, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [buyerAddress, projectId, pointsEarned.toString(), pointsEarned.toString(), new Date().toISOString(), new Date().toISOString()]
    })
  } else {
    await client.execute({
      sql: `UPDATE launchpad_points 
            SET points_balance = points_balance + ?, total_earned = total_earned + ?, updated_at = ?
            WHERE user_address = ? AND project_id = ?`,
      args: [pointsEarned.toString(), pointsEarned.toString(), new Date().toISOString(), buyerAddress, projectId]
    })
  }

  // Update or create anti-bot record
  const antibotResult = await client.execute({
    sql: 'SELECT * FROM launchpad_antibot WHERE user_address = ? AND project_id = ?',
    args: [buyerAddress, projectId]
  })

  if (antibotResult.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO launchpad_antibot (user_address, project_id, purchase_count, last_purchase_round, total_tokens_bought)
            VALUES (?, ?, 1, ?, ?)`,
      args: [buyerAddress, projectId, blockRound.toString(), tokensAmount.toString()]
    })
  } else {
    await client.execute({
      sql: `UPDATE launchpad_antibot 
            SET purchase_count = purchase_count + 1, last_purchase_round = ?, total_tokens_bought = total_tokens_bought + ?
            WHERE user_address = ? AND project_id = ?`,
      args: [blockRound.toString(), tokensAmount.toString(), buyerAddress, projectId]
    })
  }

  // Update project stats
  const project = await getProject(projectId)
  if (project) {
    // Check if this is a new participant
    const existingPurchases = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM token_purchases WHERE project_id = ? AND buyer_address = ? AND id != ?',
      args: [projectId, buyerAddress, purchaseId]
    })
    const isNewParticipant = (existingPurchases.rows[0] as any).count === 0

    await updateProject(projectId, {
      tokensSold: project.tokensSold + tokensAmount,
      algoRaised: project.algoRaised + algoPaid,
      participantCount: project.participantCount + (isNewParticipant ? 1 : 0)
    })
  }

  return purchaseId
}

// User points operations
export async function getUserPoints(userAddress: string, projectId: string): Promise<UserPoints | null> {
  await ensureInit()
  const client = await getClient()

  const result = await client.execute({
    sql: 'SELECT * FROM launchpad_points WHERE user_address = ? AND project_id = ?',
    args: [userAddress, projectId]
  })

  if (result.rows.length === 0) return null

  const row = result.rows[0] as any
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

// User portfolio operations
export async function getUserPortfolio(userAddress: string): Promise<UserPortfolio[]> {
  await ensureInit()
  const client = await getClient()

  const result = await client.execute({
    sql: `
      SELECT 
        p.project_id,
        lp.token_name,
        lp.token_symbol,
        lp.token_decimals,
        lp.logo_url,
        SUM(p.tokens_amount) as total_tokens,
        SUM(p.algo_paid) as total_algo_paid,
        SUM(p.points_earned) as total_points_earned,
        COUNT(*) as purchase_count,
        MIN(p.timestamp) as first_purchase_at,
        MAX(p.timestamp) as last_purchase_at
      FROM token_purchases p
      JOIN launch_projects lp ON p.project_id = lp.id
      WHERE p.buyer_address = ?
      GROUP BY p.project_id, lp.token_name, lp.token_symbol, lp.token_decimals, lp.logo_url
      ORDER BY last_purchase_at DESC
    `,
    args: [userAddress]
  })

  return result.rows.map((row: any) => ({
    projectId: row.project_id,
    tokenName: row.token_name,
    tokenSymbol: row.token_symbol,
    tokenDecimals: row.token_decimals,
    logoUrl: row.logo_url || undefined,
    tokensHeld: BigInt(row.total_tokens),
    algoSpent: BigInt(row.total_algo_paid),
    averagePrice: BigInt(row.total_algo_paid) * BigInt(10 ** 6) / BigInt(row.total_tokens),
    purchaseCount: row.purchase_count,
    totalPointsEarned: BigInt(row.total_points_earned),
    firstPurchaseAt: row.first_purchase_at,
    lastPurchaseAt: row.last_purchase_at
  }))
}
