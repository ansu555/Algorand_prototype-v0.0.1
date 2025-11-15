/**
 * FractionalizeASA SDK
 * 
 * A modular, reusable SDK for fractionalizing high-value assets on Algorand.
 * This module can be integrated into various applications across different industries:
 * - Art: Fractionalizing valuable artwork
 * - Real Estate: Tokenizing property ownership
 * - Venture Capital: Fractionalizing fund investments
 * - Carbon Credits: Democratizing environmental assets
 * - Collectibles: Fractionalizing rare physical items
 * 
 * Standards Compliance:
 * - ARC-3: NFT metadata standard
 * - ARC-20: Fungible token standard
 * - ARC-0010/0011: dApp integration
 * 
 * @example
 * ```typescript
 * import { FractionalizeASA } from '@/lib/fractionalize/sdk'
 * 
 * const sdk = new FractionalizeASA()
 * 
 * // Fractionalize an art piece
 * const result = await sdk.fractionalizeAsset({
 *   category: 'art',
 *   name: 'Starry Night',
 *   description: 'Famous masterpiece by Van Gogh',
 *   image_url: 'ipfs://...',
 *   total_fractions: 1000,
 *   fraction_price: 1_000_000, // 1 ALGO
 *   creator: account,
 *   properties: {
 *     artist: 'Vincent van Gogh',
 *     year_created: '1889',
 *   }
 * })
 * ```
 */

// Core types
export type {
  // Standards
  ARC3Metadata,
  ARC20Metadata,
  
  // Main types
  FractionalizedAsset,
  FractionPurchase,
  FractionOwnership,
  FractionalizationConfig,
  FractionalizationResult,
  PurchaseResult,
  AssetCategory,
  
  // Industry-specific metadata
  ArtFractionMetadata,
  RealEstateFractionMetadata,
  VCFundFractionMetadata,
  CarbonCreditFractionMetadata,
  
  // Escrow state
  EscrowState,
} from './types'

// Constants
export {
  FRACTIONALIZE_CONSTANTS,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
} from './types'

// Core functionality
export {
  // ARC-3 NFT minting
  mintARC3NFT,
  
  // ARC-20 token creation
  createARC20FractionalToken,
  
  // Escrow management
  lockNFTInEscrow,
  
  // Complete fractionalization flow
  fractionalizeAsset,
  
  // Purchase flow
  purchaseFractions,
} from './core'

// Database operations
export {
  // IPFS
  uploadToIPFS,
  fetchFromIPFS,
  
  // Asset management
  createFractionalizedAsset,
  updateAssetWithFractionalization,
  getFractionalizedAsset,
  getAllFractionalizedAssets,
  
  // Purchase tracking
  recordFractionPurchase,
  
  // Ownership
  getUserFractionOwnership,
  getAssetOwners,
  
  // Analytics
  trackPageView,
  getTopPerformingAssets,
} from './db'

/**
 * Main SDK Class
 * 
 * Provides a unified interface for all fractionalization operations.
 * Can be extended for industry-specific implementations.
 */
export class FractionalizeASA {
  /**
   * Fractionalize an asset
   * 
   * This is the main entry point for creating a fractionalization.
   * It handles the complete flow:
   * 1. Mint ARC-3 NFT
   * 2. Deploy escrow contract
   * 3. Create ARC-20 fractional tokens
   * 4. Lock NFT in escrow
   * 5. Record in database
   */
  async fractionalize(config: any) {
    const { fractionalizeAsset } = await import('./core')
    return fractionalizeAsset(config)
  }
  
  /**
   * Purchase fractions of an asset
   */
  async purchase(assetId: string, amount: number, buyer: any) {
    const { purchaseFractions } = await import('./core')
    return purchaseFractions(assetId, amount, buyer)
  }
  
  /**
   * Get asset details
   */
  async getAsset(assetId: string) {
    const { getFractionalizedAsset } = await import('./db')
    return getFractionalizedAsset(assetId)
  }
  
  /**
   * List all assets
   */
  async listAssets(filters?: any) {
    const { getAllFractionalizedAssets } = await import('./db')
    return getAllFractionalizedAssets(filters)
  }
  
  /**
   * Get user portfolio
   */
  async getPortfolio(userAddress: string) {
    const { getUserFractionOwnership } = await import('./db')
    return getUserFractionOwnership(userAddress)
  }
}

/**
 * Industry-Specific SDK Extensions
 */

/**
 * ArtShare - Art Fractionalization Module
 */
export class ArtShareSDK extends FractionalizeASA {
  async fractionalizeArt(config: {
    name: string
    description: string
    image_url: string
    artist: string
    year_created: string
    medium: string
    total_fractions: number
    fraction_price: number
    creator: any
  }) {
    return this.fractionalize({
      ...config,
      category: 'art',
      properties: {
        artist: config.artist,
        year_created: config.year_created,
        medium: config.medium,
      },
    })
  }
}

/**
 * RealEstateShare - Real Estate Fractionalization Module
 */
export class RealEstateSDK extends FractionalizeASA {
  async fractionalizeProperty(config: {
    name: string
    description: string
    image_url: string
    address: string
    property_type: 'residential' | 'commercial' | 'land'
    square_footage: number
    year_built?: number
    total_fractions: number
    fraction_price: number
    creator: any
  }) {
    return this.fractionalize({
      ...config,
      category: 'realestate',
      properties: {
        address: config.address,
        property_type: config.property_type,
        square_footage: config.square_footage,
        year_built: config.year_built,
      },
    })
  }
}

/**
 * VCFundShare - Venture Capital Fund Fractionalization Module
 */
export class VCFundSDK extends FractionalizeASA {
  async fractionalizeFund(config: {
    name: string
    description: string
    image_url: string
    fund_name: string
    fund_manager: string
    target_raise: number
    investment_strategy: string
    minimum_investment: number
    term_years: number
    total_fractions: number
    fraction_price: number
    creator: any
  }) {
    return this.fractionalize({
      ...config,
      category: 'vc',
      properties: {
        fund_name: config.fund_name,
        fund_manager: config.fund_manager,
        target_raise: config.target_raise,
        investment_strategy: config.investment_strategy,
        minimum_investment: config.minimum_investment,
        term_years: config.term_years,
      },
    })
  }
}

/**
 * CarbonCreditShare - Carbon Credits Fractionalization Module
 */
export class CarbonCreditSDK extends FractionalizeASA {
  async fractionalizeCarbonCredit(config: {
    name: string
    description: string
    image_url: string
    project_name: string
    credit_type: 'removal' | 'avoidance' | 'reduction'
    tonnes_co2: number
    verification_standard: string
    vintage_year: number
    total_fractions: number
    fraction_price: number
    creator: any
  }) {
    return this.fractionalize({
      ...config,
      category: 'carbon',
      properties: {
        project_name: config.project_name,
        credit_type: config.credit_type,
        tonnes_co2: config.tonnes_co2,
        verification_standard: config.verification_standard,
        vintage_year: config.vintage_year,
      },
    })
  }
}

/**
 * Usage Examples for Judges
 */
export const USAGE_EXAMPLES = {
  art: `
// Fractionalize artwork
import { ArtShareSDK } from '@/lib/fractionalize/sdk'

const artShare = new ArtShareSDK()
const result = await artShare.fractionalizeArt({
  name: "Starry Night",
  description: "Famous masterpiece by Van Gogh",
  image_url: "ipfs://Qm...",
  artist: "Vincent van Gogh",
  year_created: "1889",
  medium: "Oil on canvas",
  total_fractions: 1000,
  fraction_price: 1_000_000, // 1 ALGO
  creator: account
})
`,
  
  realestate: `
// Fractionalize real estate
import { RealEstateSDK } from '@/lib/fractionalize/sdk'

const realEstate = new RealEstateSDK()
const result = await realEstate.fractionalizeProperty({
  name: "Miami Beach Condo",
  description: "Luxury waterfront property",
  image_url: "ipfs://Qm...",
  address: "123 Ocean Drive, Miami, FL",
  property_type: "residential",
  square_footage: 2500,
  year_built: 2020,
  total_fractions: 10000,
  fraction_price: 10_000_000, // 10 ALGO
  creator: account
})
`,
  
  vc: `
// Fractionalize VC fund
import { VCFundSDK } from '@/lib/fractionalize/sdk'

const vcFund = new VCFundSDK()
const result = await vcFund.fractionalizeFund({
  name: "Tech Innovators Fund I",
  description: "Early-stage AI startups fund",
  image_url: "ipfs://Qm...",
  fund_name: "Tech Innovators Fund I",
  fund_manager: "VC Partners LLC",
  target_raise: 50_000_000,
  investment_strategy: "Early-stage AI and ML companies",
  minimum_investment: 100_000,
  term_years: 10,
  total_fractions: 100000,
  fraction_price: 500_000_000, // 500 ALGO
  creator: account
})
`,
  
  carbon: `
// Fractionalize carbon credits
import { CarbonCreditSDK } from '@/lib/fractionalize/sdk'

const carbonCredit = new CarbonCreditSDK()
const result = await carbonCredit.fractionalizeCarbonCredit({
  name: "Amazon Rainforest Conservation",
  description: "Carbon removal project in Brazil",
  image_url: "ipfs://Qm...",
  project_name: "Amazon Conservation Project 2024",
  credit_type: "removal",
  tonnes_co2: 10000,
  verification_standard: "Verra VCS",
  vintage_year: 2024,
  total_fractions: 10000,
  fraction_price: 1_000_000, // 1 ALGO per tonne
  creator: account
})
`,
}
