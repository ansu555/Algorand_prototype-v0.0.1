/**
 * X Token Library
 * ===============
 * 
 * The official reward token for the 10xSwap ecosystem on Algorand.
 * 
 * This library provides:
 * - Token configuration and constants
 * - On-chain operations (transfer, opt-in, balance)
 * - Treasury management for reward distribution
 * - Utility functions for formatting and calculations
 * 
 * @example
 * ```typescript
 * import { 
 *   getXTokenBalance, 
 *   transferFromTreasury,
 *   X_TOKEN_CONFIG,
 *   formatXTokenAmount 
 * } from '@/lib/xtoken'
 * 
 * // Check user balance
 * const balance = await getXTokenBalance(userAddress)
 * console.log(`Balance: ${formatXTokenAmount(balance.balance)}`)
 * 
 * // Transfer tokens as reward
 * const result = await transferFromTreasury(userAddress, 100, 'Quest completion')
 * ```
 */

// Configuration and constants
export {
  X_TOKEN_CONFIG,
  X_TOKEN_DEPLOYMENT,
  setXTokenDeployment,
  getXTokenAsaId,
  getTreasuryAddress,
  toBaseUnits,
  fromBaseUnits,
  formatXTokenAmount,
  getFeeDiscount,
  type XTokenDeployment,
} from './config'

// On-chain operations
export {
  getAlgodClient,
  getIndexerClient,
  isOptedIn,
  getXTokenBalance,
  buildOptInTransaction,
  buildOptOutTransaction,
  transferFromTreasury,
  buildTransferTransaction,
  getXTokenInfo,
  getXTokenHolders,
  type TokenOperationResult,
  type XTokenBalance,
} from './operations'

// Re-export streak multiplier from rewards types for convenience
export { getStreakMultiplier } from '@/lib/rewards/types'
