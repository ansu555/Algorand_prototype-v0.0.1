# Asset Discovery System

## Overview

The Asset Discovery System automatically discovers tradeable assets from DEX pools instead of using hardcoded asset lists. It scans multiple DEXs (Tinyman, Pact) to find all assets that have active liquidity pools, making them available in swap card dropdowns.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Asset Discovery Flow                      │
└─────────────────────────────────────────────────────────────┘

1. DEX Pool Scanning
   ├── Tinyman Analytics API ─→ Extract asset IDs from pools
   ├── Pact Finance API      ─→ Extract asset IDs from pools
   └── Future: Add more DEXs

2. Asset Information Enrichment
   ├── Algorand Indexer      ─→ Fetch asset details
   ├── Pool Count Tracking   ─→ Count pools per asset
   └── DEX Source Tracking   ─→ Track which DEXs list each asset

3. Caching & Optimization
   ├── In-memory cache (1 hour TTL)
   ├── Background refresh capability
   └── Fast subsequent reads

4. Frontend Integration
   ├── React Hooks           ─→ useTradeableAssets()
   ├── Asset Selector UI     ─→ Dropdown with search
   └── Swap Card Integration ─→ Dynamic asset selection
```

## Components

### 1. Backend Service: `AssetDiscoveryService`

**Location**: `src/lib/assets/asset-discovery.ts`

**Features**:
- Scans Tinyman and Pact pools for tradeable assets
- Fetches asset metadata from Algorand Indexer
- Tracks pool count and DEX sources per asset
- Caches results for 1 hour
- Supports both mainnet and testnet

**Key Methods**:
```typescript
// Discover all tradeable assets
await discoveryService.discoverTradeableAssets()
// Returns: AssetInfo[]

// Get specific asset info
await discoveryService.getAssetInfo(assetId)
// Returns: AssetInfo | null

// Manual cache refresh
discoveryService.clearCache()
```

### 2. API Endpoints

#### GET `/api/assets/tradeable`
**Purpose**: Fetch all tradeable assets discovered from DEX pools

**Response**:
```json
{
  "assets": [
    {
      "id": 0,
      "name": "Algorand",
      "unitName": "ALGO",
      "decimals": 6,
      "total": 10000000000000000,
      "creator": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
      "verified": true,
      "poolCount": 150,
      "dexSources": ["Tinyman", "Pact"],
      "logoUrl": "https://..."
    }
  ],
  "count": 250,
  "lastUpdate": 1698765432,
  "network": "testnet"
}
```

**Usage**:
```typescript
const response = await fetch('/api/assets/tradeable');
const { assets } = await response.json();
```

#### POST `/api/assets/tradeable`
**Purpose**: Manually refresh the asset cache

**Response**:
```json
{
  "success": true,
  "message": "Asset cache refreshed",
  "count": 250
}
```

#### GET `/api/assets/[assetId]`
**Purpose**: Get detailed information for a specific asset

**URL**: `/api/assets/31566704`

**Response**:
```json
{
  "asset": {
    "id": 31566704,
    "name": "USDC",
    "unitName": "USDC",
    "decimals": 6,
    "verified": true,
    "poolCount": 45,
    "dexSources": ["Tinyman", "Pact"]
  }
}
```

#### GET `/api/assets/search?q=USD`
**Purpose**: Search for assets by name or symbol

**Query Parameters**:
- `q` (required): Search query (min 2 characters)
- `limit` (optional): Max results (default: 20)

**Response**:
```json
{
  "results": [
    { "id": 31566704, "name": "USDC", "unitName": "USDC", ... },
    { "id": 31566705, "name": "USDt", "unitName": "USDT", ... }
  ],
  "count": 2
}
```

#### GET `/api/assets/account/[address]`
**Purpose**: Get all assets held by a specific address

**URL**: `/api/assets/account/ADDR...`

**Response**:
```json
{
  "address": "ADDR...",
  "assets": [
    {
      "assetId": 31566704,
      "amount": 1000000,
      "isFrozen": false,
      "assetInfo": {
        "id": 31566704,
        "name": "USDC",
        "unitName": "USDC",
        ...
      }
    }
  ],
  "count": 5
}
```

### 3. React Hooks

**Location**: `src/hooks/use-tradeable-assets.ts`

#### `useTradeableAssets()`
Fetches all tradeable assets with loading and error states.

**Usage**:
```typescript
import { useTradeableAssets } from '@/hooks/use-tradeable-assets';

function MyComponent() {
  const { assets, loading, error, refresh } = useTradeableAssets();

  if (loading) return <div>Loading assets...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={refresh}>Refresh</button>
      {assets.map(asset => (
        <div key={asset.id}>{asset.unitName}</div>
      ))}
    </div>
  );
}
```

**Return Type**:
```typescript
{
  assets: AssetInfo[];      // Array of discovered assets
  loading: boolean;         // True while fetching
  error: string | null;     // Error message if failed
  refresh: () => void;      // Function to refresh data
}
```

#### `useAssetSearch(query: string)`
Searches assets with debouncing (300ms delay).

**Usage**:
```typescript
import { useAssetSearch } from '@/hooks/use-tradeable-assets';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const { results, loading } = useAssetSearch(query);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search assets..."
      />
      {loading && <div>Searching...</div>}
      {results.map(asset => (
        <div key={asset.id}>{asset.unitName} - {asset.name}</div>
      ))}
    </div>
  );
}
```

**Return Type**:
```typescript
{
  results: AssetInfo[];     // Matching assets
  loading: boolean;         // True while searching
}
```

### 4. UI Component: `AssetSelector`

**Location**: `src/components/features/trading/asset-selector.tsx`

**Features**:
- Dropdown with search functionality
- Asset logos and verified badges
- Keyboard navigation support
- Click-outside to close
- Loading states

**Usage**:
```typescript
import { AssetSelector } from '@/components/features/trading/asset-selector';
import { useTradeableAssets } from '@/hooks/use-tradeable-assets';

function SwapForm() {
  const { assets, loading } = useTradeableAssets();
  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null);

  return (
    <AssetSelector
      assets={assets}
      selected={selectedAsset}
      onSelect={setSelectedAsset}
      label="Select token"
      disabled={loading}
    />
  );
}
```

**Props**:
```typescript
interface AssetSelectorProps {
  assets: AssetInfo[];           // Available assets
  selected: AssetInfo | null;    // Currently selected
  onSelect: (asset: AssetInfo) => void; // Selection callback
  label?: string;                // Placeholder text
  disabled?: boolean;            // Disable selector
}
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interaction                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
                   ┌─────────────────────┐
                   │  useTradeableAssets │
                   │      React Hook     │
                   └─────────────────────┘
                              │
                              ↓ fetch()
                   ┌─────────────────────┐
                   │  /api/assets/       │
                   │    tradeable        │
                   └─────────────────────┘
                              │
                              ↓
                   ┌─────────────────────┐
                   │ AssetDiscovery      │
                   │    Service          │
                   └─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │  Tinyman    │ │    Pact     │ │   Indexer   │
      │     API     │ │     API     │ │     API     │
      └─────────────┘ └─────────────┘ └─────────────┘
           Pool IDs      Pool IDs      Asset Details
```

## AssetInfo Interface

```typescript
export interface AssetInfo {
  id: number;              // Asset ID (0 for ALGO)
  name: string;            // Full name
  unitName: string;        // Symbol/ticker
  decimals: number;        // Decimal places
  total: number;           // Total supply
  creator: string;         // Creator address
  url?: string;            // Asset URL
  verified?: boolean;      // Verified status
  hasPools?: boolean;      // Has liquidity pools
  logoUrl?: string;        // Logo image URL
  poolCount?: number;      // Number of pools
  dexSources?: string[];   // DEXs listing this asset
}
```

## Caching Strategy

### Backend Cache
- **Duration**: 1 hour (3600 seconds)
- **Storage**: In-memory Map
- **Invalidation**: Time-based + manual refresh
- **Key**: Asset ID
- **Value**: AssetInfo object

### Frontend Cache
- **Duration**: React Query / SWR (configurable)
- **Revalidation**: On window focus, network reconnect
- **Stale time**: 60 seconds

## Performance Considerations

### Initial Load
- First discovery: ~5-10 seconds (fetches from APIs + Indexer)
- Cached reads: <10ms

### Optimization Techniques
1. **Parallel API Calls**: Fetch Tinyman and Pact pools concurrently
2. **Batch Asset Lookups**: Group Indexer requests
3. **Deduplication**: Use Set to avoid duplicate assets
4. **Lazy Loading**: Only fetch detailed info for discovered assets

### Rate Limiting
- Tinyman API: No documented limit (be respectful)
- Pact API: No documented limit (be respectful)
- Algorand Indexer: Generous limits (public node)

**Best Practice**: Cache aggressively, refresh periodically

## Testing

### Test Script
**Location**: `scripts/test-asset-discovery.ts`

**Run**:
```bash
npx tsx scripts/test-asset-discovery.ts
```

**Tests**:
- ✅ Discover assets from Tinyman
- ✅ Discover assets from Pact
- ✅ Fetch asset details from Indexer
- ✅ Track pool counts and DEX sources
- ✅ Specific asset lookup (ALGO)
- ✅ Search functionality
- ✅ Cache performance

### Manual Testing

1. **Test Asset Discovery**:
```bash
curl http://localhost:3000/api/assets/tradeable
```

2. **Test Search**:
```bash
curl http://localhost:3000/api/assets/search?q=USDC
```

3. **Test Specific Asset**:
```bash
curl http://localhost:3000/api/assets/31566704
```

4. **Test Cache Refresh**:
```bash
curl -X POST http://localhost:3000/api/assets/tradeable
```

## Integration with Swap Card

The `SwapCard` component now uses dynamic asset discovery:

**Before** (Hardcoded):
```typescript
const TOKENS = [
  { symbol: 'ALGO', name: 'Algorand', ... },
  { symbol: 'USDC', name: 'USD Coin', ... },
  { symbol: 'USDT', name: 'Tether', ... },
];
```

**After** (Dynamic):
```typescript
const { assets, loading } = useTradeableAssets();

<AssetSelector
  assets={assets}
  selected={fromToken}
  onSelect={setFromToken}
  disabled={loading}
/>
```

## Error Handling

### Backend Errors
```typescript
try {
  const assets = await service.discoverTradeableAssets();
} catch (error) {
  console.error('Asset discovery failed:', error);
  // Falls back to cached assets
  return cachedAssets;
}
```

### Frontend Errors
```typescript
const { assets, error } = useTradeableAssets();

if (error) {
  return <ErrorComponent message={error} />;
}
```

### Common Issues

1. **404 Errors from Indexer**
   - Some assets in pools may not exist on testnet
   - Service logs warnings but continues
   - Only successfully fetched assets are included

2. **API Rate Limits**
   - Implement exponential backoff
   - Cache aggressively
   - Use batch requests where possible

3. **Network Timeouts**
   - Set reasonable timeouts (10s)
   - Fallback to cached data
   - Retry with exponential backoff

## Future Enhancements

### Phase 1: More DEXs
- [ ] Add Vestige DEX integration
- [ ] Add Humble DeFi integration
- [ ] Add AlgoFi integration (if applicable)

### Phase 2: Enhanced Metadata
- [ ] Fetch logos from Algorand Foundation
- [ ] Add price data integration
- [ ] Add 24h volume tracking
- [ ] Add TVL (Total Value Locked)

### Phase 3: Advanced Features
- [ ] Asset popularity rankings
- [ ] Recent trading activity
- [ ] User watchlists
- [ ] Portfolio tracking

### Phase 4: Performance
- [ ] Database persistence (instead of memory cache)
- [ ] Incremental updates (only changed assets)
- [ ] WebSocket for real-time updates
- [ ] CDN for asset logos

## Configuration

### Environment Variables
```bash
# Network selection
NEXT_PUBLIC_ALGORAND_NETWORK=testnet  # or mainnet

# API URLs (optional, uses defaults)
ALGORAND_INDEXER_URL=https://testnet-idx.algonode.cloud
TINYMAN_API_URL=https://testnet.analytics.tinyman.org/api/v1
PACT_API_URL=https://api.pact.fi/api

# Cache settings
ASSET_CACHE_DURATION=3600  # seconds
```

### Network-Specific Behavior

**Testnet**:
- Uses Tinyman testnet analytics
- Uses Pact mainnet API (filters testnet pools)
- Algorand testnet Indexer

**Mainnet**:
- Uses Tinyman mainnet analytics
- Uses Pact mainnet API
- Algorand mainnet Indexer

## Monitoring

### Metrics to Track
1. **Discovery Duration**: Time to scan all DEXs
2. **Asset Count**: Total tradeable assets
3. **Cache Hit Rate**: % of requests served from cache
4. **Error Rate**: Failed API calls / total calls
5. **User Engagement**: Most selected assets

### Logging
```typescript
console.log(`Discovered ${count} assets in ${duration}ms`);
console.log(`Tinyman: ${tinymanCount} assets, Pact: ${pactCount} assets`);
console.warn(`Failed to fetch asset ${id}: ${error}`);
```

## Security Considerations

1. **Input Validation**: Validate asset IDs before Indexer queries
2. **Rate Limiting**: Implement request limits on API endpoints
3. **CORS**: Configure appropriate CORS headers
4. **Sanitization**: Sanitize asset names/symbols for XSS
5. **Cache Poisoning**: Validate data before caching

## Summary

The Asset Discovery System provides a complete solution for dynamically populating swap card dropdowns with tradeable assets:

✅ **Automated Discovery**: No hardcoded asset lists  
✅ **Multi-DEX Support**: Tinyman, Pact (more coming)  
✅ **Rich Metadata**: Logos, verification, pool counts  
✅ **Fast Performance**: 1-hour caching, <10ms reads  
✅ **User-Friendly**: Search, filters, verified badges  
✅ **Developer-Friendly**: Simple hooks and components  
✅ **Production-Ready**: Error handling, fallbacks, logging  

**Result**: Users can trade any asset with available liquidity, automatically!
