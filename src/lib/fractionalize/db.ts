import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import type {
  FractionalizedAsset,
  FractionPurchase,
  FractionOwnership,
  ARC3Metadata,
  ARC20Metadata,
  AssetCategory,
  FractionalizationConfig,
} from './types'

// Database connection
let db: Database.Database | null = null

export function getDB(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'fractionalize.sqlite')
    
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    
    // Initialize schema
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'fractionalize', 'schema.sql')
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8')
      db.exec(schema)
    }
  }
  
  return db
}

/**
 * IPFS Integration Functions
 */

export interface IPFSUploadResult {
  ipfsHash: string
  ipfsUrl: string
  gatewayUrl: string
  sha256Hash: string
}

/**
 * Upload metadata to IPFS (Pinata)
 * Requires PINATA_API_KEY and PINATA_SECRET_KEY in environment
 */
export async function uploadToIPFS(
  content: ARC3Metadata | ARC20Metadata,
  contentType: 'arc3' | 'arc20'
): Promise<IPFSUploadResult> {
  const contentString = JSON.stringify(content, null, 2)
  const sha256Hash = crypto.createHash('sha256').update(contentString).digest('hex')
  
  // Check if already uploaded
  const database = getDB()
  const existing = database.prepare(`
    SELECT ipfs_hash, sha256_hash FROM ipfs_metadata
    WHERE sha256_hash = ? AND content_type = ?
  `).get(sha256Hash, contentType) as any
  
  if (existing) {
    return {
      ipfsHash: existing.ipfs_hash,
      ipfsUrl: `ipfs://${existing.ipfs_hash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${existing.ipfs_hash}`,
      sha256Hash: existing.sha256_hash,
    }
  }
  
  try {
    // Upload to Pinata
    const pinataApiKey = process.env.PINATA_API_KEY
    const pinataSecretKey = process.env.PINATA_SECRET_KEY
    
    if (!pinataApiKey || !pinataSecretKey) {
      throw new Error('IPFS credentials not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY')
    }
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey,
      },
      body: JSON.stringify({
        pinataContent: content,
        pinataMetadata: {
          name: `${contentType}_${Date.now()}.json`,
        },
      }),
    })
    
    if (!response.ok) {
      throw new Error(`IPFS upload failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    const ipfsHash = data.IpfsHash
    
    // Cache in database
    database.prepare(`
      INSERT INTO ipfs_metadata (ipfs_hash, content, content_type, file_size, sha256_hash, verified, uploaded_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    `).run(ipfsHash, contentString, contentType, contentString.length, sha256Hash)
    
    return {
      ipfsHash,
      ipfsUrl: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      sha256Hash,
    }
  } catch (error) {
    console.error('IPFS upload error:', error)
    throw new Error(`Failed to upload to IPFS: ${error}`)
  }
}

/**
 * Fetch metadata from IPFS
 */
export async function fetchFromIPFS(ipfsHashOrUrl: string): Promise<ARC3Metadata | ARC20Metadata> {
  const database = getDB()
  
  // Extract hash from URL if needed
  const ipfsHash = ipfsHashOrUrl.replace('ipfs://', '').split('/')[0]
  
  // Check cache first
  const cached = database.prepare(`
    SELECT content FROM ipfs_metadata WHERE ipfs_hash = ?
  `).get(ipfsHash) as any
  
  if (cached) {
    // Update access stats
    database.prepare(`
      UPDATE ipfs_metadata 
      SET last_accessed = CURRENT_TIMESTAMP, access_count = access_count + 1
      WHERE ipfs_hash = ?
    `).run(ipfsHash)
    
    return JSON.parse(cached.content)
  }
  
  // Fetch from gateway
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`)
    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.statusText}`)
    }
    
    const content = await response.json()
    const contentString = JSON.stringify(content)
    
    // Cache it
    database.prepare(`
      INSERT INTO ipfs_metadata (ipfs_hash, content, content_type, file_size, uploaded_at, last_accessed, access_count)
      VALUES (?, ?, 'unknown', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
    `).run(ipfsHash, contentString, contentString.length)
    
    return content
  } catch (error) {
    console.error('IPFS fetch error:', error)
    throw new Error(`Failed to fetch from IPFS: ${error}`)
  }
}

/**
 * Database Operations - Fractionalized Assets
 */

export function createFractionalizedAsset(
  config: {
    original_asset_id: number
    category: AssetCategory
    name: string
    description: string
    image_url: string
    metadata_url: string
    metadata_hash: string
    total_fractions: number
    fraction_price: number
    valuation: number
    creator_address: string
    properties?: Record<string, any>
  }
): string {
  const database = getDB()
  const id = uuidv4()
  
  database.prepare(`
    INSERT INTO fractionalized_assets (
      id, original_asset_id, category, name, description,
      image_url, metadata_url, metadata_hash,
      total_fractions, fraction_price, valuation,
      creator_address, status, properties, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
  `).run(
    id,
    config.original_asset_id,
    config.category,
    config.name,
    config.description,
    config.image_url,
    config.metadata_url,
    config.metadata_hash,
    config.total_fractions,
    config.fraction_price,
    config.valuation,
    config.creator_address,
    config.properties ? JSON.stringify(config.properties) : null
  )
  
  // Initialize analytics
  database.prepare(`
    INSERT INTO fractionalize_analytics (asset_id, last_updated)
    VALUES (?, CURRENT_TIMESTAMP)
  `).run(id)
  
  return id
}

export function updateAssetWithFractionalization(
  assetId: string,
  data: {
    fractional_token_id: number
    escrow_address: string
    escrow_app_id: number
    escrow_deploy_txid: string
    fraction_creation_txid: string
  }
): void {
  const database = getDB()
  
  database.prepare(`
    UPDATE fractionalized_assets
    SET fractional_token_id = ?,
        escrow_address = ?,
        escrow_app_id = ?,
        escrow_deploy_txid = ?,
        fraction_creation_txid = ?,
        status = 'active',
        activated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.fractional_token_id,
    data.escrow_address,
    data.escrow_app_id,
    data.escrow_deploy_txid,
    data.fraction_creation_txid,
    assetId
  )
}

export function getFractionalizedAsset(assetId: string): FractionalizedAsset | null {
  const database = getDB()
  
  const asset = database.prepare(`
    SELECT * FROM fractionalized_assets WHERE id = ?
  `).get(assetId) as any
  
  if (!asset) return null
  
  return {
    ...asset,
    properties: asset.properties ? JSON.parse(asset.properties) : undefined,
  }
}

export function getAllFractionalizedAssets(filters?: {
  category?: AssetCategory
  status?: string
  creator?: string
  limit?: number
  offset?: number
}): FractionalizedAsset[] {
  const database = getDB()
  
  let query = 'SELECT * FROM fractionalized_assets WHERE 1=1'
  const params: any[] = []
  
  if (filters?.category) {
    query += ' AND category = ?'
    params.push(filters.category)
  }
  
  if (filters?.status) {
    query += ' AND status = ?'
    params.push(filters.status)
  }
  
  if (filters?.creator) {
    query += ' AND creator_address = ?'
    params.push(filters.creator)
  }
  
  query += ' ORDER BY created_at DESC'
  
  if (filters?.limit) {
    query += ' LIMIT ?'
    params.push(filters.limit)
    
    if (filters?.offset) {
      query += ' OFFSET ?'
      params.push(filters.offset)
    }
  }
  
  const assets = database.prepare(query).all(...params) as any[]
  
  return assets.map(asset => ({
    ...asset,
    properties: asset.properties ? JSON.parse(asset.properties) : undefined,
  }))
}

export function recordFractionPurchase(
  assetId: string,
  buyerAddress: string,
  amount: number,
  pricePerFraction: number,
  transactionId: string,
  blockNumber?: number
): string {
  const database = getDB()
  const purchaseId = uuidv4()
  
  database.transaction(() => {
    // Record purchase
    database.prepare(`
      INSERT INTO fraction_purchases (
        id, asset_id, buyer_address, amount, price_per_fraction,
        total_paid, transaction_id, block_number, purchased_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      purchaseId,
      assetId,
      buyerAddress,
      amount,
      pricePerFraction,
      amount * pricePerFraction,
      transactionId,
      blockNumber || null
    )
    
    // Update asset sold count
    database.prepare(`
      UPDATE fractionalized_assets
      SET fractions_sold = fractions_sold + ?,
          total_raised = total_raised + ?
      WHERE id = ?
    `).run(amount, amount * pricePerFraction, assetId)
    
    // Update or create ownership record
    const existing = database.prepare(`
      SELECT fraction_amount FROM fraction_ownership
      WHERE asset_id = ? AND owner_address = ?
    `).get(assetId, buyerAddress) as any
    
    if (existing) {
      const newAmount = existing.fraction_amount + amount
      const asset = getFractionalizedAsset(assetId)!
      const newPercentage = (newAmount / asset.total_fractions) * 100
      
      database.prepare(`
        UPDATE fraction_ownership
        SET fraction_amount = ?,
            percentage = ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE asset_id = ? AND owner_address = ?
      `).run(newAmount, newPercentage, assetId, buyerAddress)
    } else {
      const asset = getFractionalizedAsset(assetId)!
      const percentage = (amount / asset.total_fractions) * 100
      
      database.prepare(`
        INSERT INTO fraction_ownership (
          asset_id, owner_address, fraction_amount, percentage,
          first_acquired_at, last_updated
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(assetId, buyerAddress, amount, percentage)
    }
    
    // Update analytics
    database.prepare(`
      UPDATE fractionalize_analytics
      SET purchase_conversions = purchase_conversions + 1,
          total_transaction_volume = total_transaction_volume + ?,
          last_updated = CURRENT_TIMESTAMP
      WHERE asset_id = ?
    `).run(amount * pricePerFraction, assetId)
    
    // Check if fully sold
    const asset = getFractionalizedAsset(assetId)!
    if (asset.fractions_sold + amount >= asset.total_fractions) {
      database.prepare(`
        UPDATE fractionalized_assets
        SET status = 'fully_sold', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(assetId)
    }
  })()
  
  return purchaseId
}

export function getUserFractionOwnership(userAddress: string): FractionOwnership[] {
  const database = getDB()
  
  return database.prepare(`
    SELECT * FROM user_fractionalized_portfolio
    WHERE owner_address = ?
    ORDER BY first_acquired_at DESC
  `).all(userAddress) as any[]
}

export function getAssetOwners(assetId: string): FractionOwnership[] {
  const database = getDB()
  
  return database.prepare(`
    SELECT * FROM fraction_ownership
    WHERE asset_id = ?
    ORDER BY fraction_amount DESC
  `).all(assetId) as any[]
}

/**
 * Analytics Functions
 */

export function trackPageView(assetId: string, uniqueVisitor: boolean = false): void {
  const database = getDB()
  
  const updates = ['page_views = page_views + 1']
  if (uniqueVisitor) {
    updates.push('unique_visitors = unique_visitors + 1')
  }
  
  database.prepare(`
    UPDATE fractionalize_analytics
    SET ${updates.join(', ')}, last_updated = CURRENT_TIMESTAMP
    WHERE asset_id = ?
  `).run(assetId)
}

export function getTopPerformingAssets(limit: number = 10): any[] {
  const database = getDB()
  
  return database.prepare(`
    SELECT * FROM top_performing_assets LIMIT ?
  `).all(limit) as any[]
}
