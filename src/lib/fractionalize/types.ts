/**
 * ARC-3 NFT Standard Types
 * https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md
 */

export interface ARC3Metadata {
  // Required fields
  name: string
  description: string
  image: string // IPFS or HTTPS URL
  
  // Optional but recommended
  image_integrity?: string // SHA-256 hash of image
  image_mimetype?: string // MIME type of image
  external_url?: string // URL to view the asset
  animation_url?: string // URL to animated version
  animation_url_integrity?: string
  animation_url_mimetype?: string
  
  // Custom properties
  properties?: {
    artist?: string
    created_at?: string
    valuation?: number
    category?: string
    [key: string]: any
  }
  
  // Localization
  localization?: {
    uri: string
    default: string
    locales: string[]
  }
  
  // Extra metadata
  extra_metadata?: string // Base64 encoded arbitrary data
}

/**
 * ARC-20 Fungible Token Standard Types
 * https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0020.md
 */

export interface ARC20Metadata {
  name: string
  symbol: string
  decimals: number
  totalSupply: string // String to handle large numbers
  description?: string
  external_url?: string
  image?: string
  properties?: {
    underlying_asset_id?: number // Original NFT ID
    fraction_type?: 'art' | 'realestate' | 'vc' | 'carbon' | 'collectible'
    total_fractions?: number
    [key: string]: any
  }
}

/**
 * Fractionalization Asset Types
 */

export type AssetCategory = 'art' | 'realestate' | 'vc' | 'carbon' | 'collectible'

export interface FractionalizedAsset {
  id: string // UUID
  original_asset_id: number // Original ARC-3 NFT ASA ID
  fractional_token_id: number // New ARC-20 token ASA ID
  escrow_address: string // Smart contract address holding NFT
  
  // Asset details
  category: AssetCategory
  name: string
  description: string
  image_url: string
  metadata_url: string // IPFS URL to full metadata
  
  // Fractionalization config
  total_fractions: number
  fraction_price: number // Price per fraction in microAlgos
  fractions_sold: number
  
  // Status
  status: 'active' | 'fully_sold' | 'redeemed'
  
  // Owner info
  creator_address: string
  created_at: string
  
  // Financials
  total_raised: number // In microAlgos
  valuation: number // Original asset valuation
}

export interface FractionPurchase {
  id: string
  asset_id: string // References FractionalizedAsset.id
  buyer_address: string
  amount: number // Number of fractions purchased
  price_per_fraction: number
  total_paid: number
  transaction_id: string
  purchased_at: string
}

export interface FractionOwnership {
  asset_id: string
  owner_address: string
  fraction_amount: number
  percentage: number // % of total ownership
  last_updated: string
}

/**
 * Smart Contract ABI Types
 */

export interface FractionalizationConfig {
  nft_asset_id: number
  total_fractions: number
  fraction_price: number
  creator: string
  category: AssetCategory
  metadata: {
    name: string
    description: string
    image_url: string
  }
}

export interface EscrowState {
  nft_locked: boolean
  fraction_token_id: number
  total_fractions: number
  fractions_distributed: number
  creator_address: string
  escrow_balance: number
}

/**
 * API Response Types
 */

export interface FractionalizationResult {
  success: boolean
  fractional_asset?: FractionalizedAsset
  escrow_address?: string
  transaction_ids?: string[]
  error?: string
}

export interface PurchaseResult {
  success: boolean
  purchase?: FractionPurchase
  transaction_id?: string
  error?: string
}

/**
 * Industry-Specific Extensions
 */

export interface ArtFractionMetadata extends ARC3Metadata {
  properties: {
    artist: string
    year_created: string
    medium: string
    dimensions?: string
    provenance?: string
    authenticity_certificate?: string
    [key: string]: any
  }
}

export interface RealEstateFractionMetadata extends ARC3Metadata {
  properties: {
    address: string
    property_type: 'residential' | 'commercial' | 'land'
    square_footage: number
    year_built?: number
    legal_description: string
    title_deed_url?: string
    appraisal_url?: string
    [key: string]: any
  }
}

export interface VCFundFractionMetadata extends ARC3Metadata {
  properties: {
    fund_name: string
    fund_manager: string
    target_raise: number
    investment_strategy: string
    minimum_investment: number
    term_years: number
    [key: string]: any
  }
}

export interface CarbonCreditFractionMetadata extends ARC3Metadata {
  properties: {
    project_name: string
    credit_type: 'removal' | 'avoidance' | 'reduction'
    tonnes_co2: number
    verification_standard: string
    vintage_year: number
    registry_url?: string
    [key: string]: any
  }
}

/**
 * Constants
 */

export const FRACTIONALIZE_CONSTANTS = {
  MIN_FRACTIONS: 100,
  MAX_FRACTIONS: 1_000_000,
  MIN_FRACTION_PRICE: 1_000_000, // 1 ALGO
  ESCROW_MIN_BALANCE: 500_000, // 0.5 ALGO for escrow contract
  IPFS_GATEWAY: 'https://gateway.pinata.cloud/ipfs/',
  METADATA_FILE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
} as const

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  art: 'Fine Art',
  realestate: 'Real Estate',
  vc: 'Venture Capital',
  carbon: 'Carbon Credits',
  collectible: 'Collectibles',
}

export const CATEGORY_DESCRIPTIONS: Record<AssetCategory, string> = {
  art: 'Fractionalize high-value artwork for accessible art investment',
  realestate: 'Tokenize property ownership for democratized real estate',
  vc: 'Fractionalize fund investments to democratize startup funding',
  carbon: 'Democratize access to environmental assets and sustainability markets',
  collectible: 'Own a piece of rare physical items like vintage cars or memorabilia',
}
