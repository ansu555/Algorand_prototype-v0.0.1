# Swap History Metadata Documentation

## Overview
All swap transactions are stored in the database with comprehensive metadata for complete user-to-user swap history tracking.

## Database Storage
- **Table**: `logs` (generic logs table)
- **Action Type**: `swap`
- **Owner**: Wallet address (normalized to lowercase)
- **Status**: `confirmed`

## Complete Metadata Stored

### Transaction Details
```typescript
{
  txId: string,                    // Algorand transaction ID
  confirmedRound: number,          // Block number where transaction was confirmed
  network: 'testnet' | 'mainnet'   // Network where swap occurred
}
```

### From Asset (Selling)
```typescript
{
  fromAssetId: number,             // Asset ID (0 for ALGO)
  fromAssetName: string,           // Full asset name (e.g., "Algorand")
  fromAssetUnitName: string,       // Unit name/symbol (e.g., "ALGO")
  fromAssetDecimals: number,       // Decimal places (e.g., 6)
  fromAmount: string,              // Human-readable amount (e.g., "10.5")
  fromAmountBaseUnits: number      // Amount in base units (e.g., 10500000)
}
```

### To Asset (Buying)
```typescript
{
  toAssetId: number,               // Asset ID (0 for ALGO)
  toAssetName: string,             // Full asset name
  toAssetUnitName: string,         // Unit name/symbol
  toAssetDecimals: number,         // Decimal places
  toAmount: string,                // Human-readable estimated amount
  toAmountEstimated: number        // Estimated amount in base units
}
```

### Swap Parameters
```typescript
{
  minimumReceived: number,         // Minimum tokens to receive (slippage protection)
  slippage: number,                // Slippage tolerance percentage (e.g., 0.5)
  expectedPricePerUnit: number     // Expected price ratio
}
```

### Route Information
```typescript
{
  route: RouteInfo[],              // Full route object from router
  routePath: Array<{               // Simplified route path
    dex: string,                   // DEX name (e.g., "Tinyman", "Pact")
    poolId: number,                // Pool application ID
    fromAsset: number,             // Input asset for this hop
    toAsset: number                // Output asset for this hop
  }>,
  priceImpact: number              // Price impact percentage (if available)
}
```

### Timestamps
```typescript
{
  swapTimestamp: string,           // ISO timestamp when swap was initiated
  createdAt: string                // ISO timestamp when log was created
}
```

## UI Display

The swap history table shows:
1. **Time**: Relative time (e.g., "2 minutes ago")
2. **From**: Token symbol + amount
3. **To**: Token symbol + estimated amount received
4. **Amount**: Full formatted amount sent
5. **Received**: Full formatted amount received (approximate)
6. **Route**: DEX names in swap path
7. **Slippage**: Configured slippage percentage
8. **Status**: Confirmed badge + link to AlgoExplorer

## Data Access

### API Endpoint
```
GET /api/swaps?address={walletAddress}
```

Returns all swaps for a specific wallet address with complete metadata.

### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "ownerAddress": "wallet_address_lowercase",
      "action": "swap",
      "status": "confirmed",
      "createdAt": "2025-11-11T12:00:00.000Z",
      "details": {
        "txId": "TX123...",
        "confirmedRound": 123456,
        "fromAssetId": 0,
        "fromAssetName": "Algorand",
        "fromAssetUnitName": "ALGO",
        "fromAssetDecimals": 6,
        "fromAmount": "10",
        "fromAmountBaseUnits": 10000000,
        "toAssetId": 312769,
        "toAssetName": "USDC",
        "toAssetUnitName": "USDC",
        "toAssetDecimals": 6,
        "toAmount": "15.234",
        "toAmountEstimated": 15234000,
        "minimumReceived": 15119000,
        "slippage": 0.5,
        "route": [...],
        "routePath": [
          { "dex": "Tinyman", "poolId": 123, "fromAsset": 0, "toAsset": 312769 }
        ],
        "priceImpact": 0.12,
        "expectedPricePerUnit": 1.5234,
        "swapTimestamp": "2025-11-11T12:00:00.000Z",
        "network": "testnet"
      }
    }
  ]
}
```

## Future Enhancements

### Recommended Improvements
1. **Dedicated Swaps Table**: Create a specialized table structure instead of using generic logs
2. **Actual Amounts**: Store actual received amounts from blockchain (currently storing estimates)
3. **Fees Tracking**: Add transaction fees and swap fees
4. **USD Values**: Store USD equivalent values at time of swap
5. **Performance Metrics**: Track execution time, gas used, etc.
6. **Aggregated Stats**: Add portfolio-level swap statistics
7. **Export Functionality**: Allow CSV/JSON export for tax reporting
8. **Filtering**: Add filters by date range, asset, DEX, etc.

### Schema Migration (Proposed)
```sql
CREATE TABLE swaps (
  id TEXT PRIMARY KEY,
  owner_address TEXT NOT NULL,
  tx_id TEXT NOT NULL,
  confirmed_round INTEGER NOT NULL,
  network TEXT NOT NULL,
  
  -- From asset
  from_asset_id INTEGER NOT NULL,
  from_asset_name TEXT,
  from_asset_unit_name TEXT,
  from_amount_human TEXT NOT NULL,
  from_amount_base_units INTEGER NOT NULL,
  
  -- To asset
  to_asset_id INTEGER NOT NULL,
  to_asset_name TEXT,
  to_asset_unit_name TEXT,
  to_amount_estimated_human TEXT,
  to_amount_actual_base_units INTEGER,
  
  -- Swap details
  slippage_percent REAL,
  minimum_received INTEGER,
  price_impact REAL,
  route_json TEXT,
  
  -- Timestamps
  swap_timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL,
  
  -- Indexes
  INDEX idx_owner (owner_address),
  INDEX idx_tx (tx_id),
  INDEX idx_timestamp (swap_timestamp)
);
```

## Notes
- All amounts are stored in both human-readable format and base units
- Wallet addresses are normalized to lowercase for consistent lookups
- Route information preserves the full path for multi-hop swaps
- Timestamps use ISO 8601 format for universal compatibility
