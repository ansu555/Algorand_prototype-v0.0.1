/**
 * Tinyman V2 Testnet Pool Application IDs
 * 
 * This is a lookup table for known Tinyman V2 pool app IDs on testnet.
 * TODO: Replace with proper Tinyman V2 SDK or API when available.
 * 
 * To find pool app IDs:
 * 1. Go to https://testnet.tinyman.org/
 * 2. Find the pool for your asset pair
 * 3. The pool app ID is in the pool details
 * 
 * Or use the Tinyman V2 SDK to calculate the pool address:
 * https://github.com/tinymanorg/tinyman-py-sdk
 */

export interface TinymanV2Pool {
  asset1Id: number
  asset2Id: number
  appId: number
  address: string
}

// Known Tinyman V2 testnet pools
// Format: "asset1_asset2" -> pool app ID
export const TINYMAN_V2_TESTNET_POOLS: Record<string, TinymanV2Pool> = {
  // Example pools - these need to be populated with real testnet pool app IDs
  // '0_10458941': {  // ALGO/USDC
  //   asset1Id: 0,
  //   asset2Id: 10458941,
  //   appId: 123456789,  // Replace with real app ID
  //   address: 'ABC...',  // Replace with real address
  // },
}

/**
 * Get pool app ID for a given asset pair
 * Handles asset order normalization (smaller ID always first)
 */
export function getTinymanV2PoolAppId(asset1Id: number, asset2Id: number): number | undefined {
  // Normalize asset order (smaller ID first)
  const [assetA, assetB] = asset1Id < asset2Id ? [asset1Id, asset2Id] : [asset2Id, asset1Id]
  const key = `${assetA}_${assetB}`
  
  return TINYMAN_V2_TESTNET_POOLS[key]?.appId
}

/**
 * Get pool info for a given asset pair
 */
export function getTinymanV2PoolInfo(asset1Id: number, asset2Id: number): TinymanV2Pool | undefined {
  // Normalize asset order (smaller ID first)
  const [assetA, assetB] = asset1Id < asset2Id ? [asset1Id, asset2Id] : [asset2Id, asset1Id]
  const key = `${assetA}_${assetB}`
  
  return TINYMAN_V2_TESTNET_POOLS[key]
}

/**
 * Add or update a pool in the lookup table
 * Useful for dynamically discovered pools
 */
export function registerTinymanV2Pool(pool: TinymanV2Pool): void {
  const [assetA, assetB] = pool.asset1Id < pool.asset2Id 
    ? [pool.asset1Id, pool.asset2Id] 
    : [pool.asset2Id, pool.asset1Id]
  const key = `${assetA}_${assetB}`
  
  TINYMAN_V2_TESTNET_POOLS[key] = {
    asset1Id: assetA,
    asset2Id: assetB,
    appId: pool.appId,
    address: pool.address,
  }
  
  console.log(`Registered Tinyman V2 pool: ${assetA}/${assetB} (app ${pool.appId})`)
}
