# Algorand ASA Migration Guide

## Overview

This project has been migrated from using CoinGecko API to **Algorand Indexer API** to display only **Algorand Standard Assets (ASAs)** with complete market analysis powered by Algorand DEX integrations (Pact, Tinyman, Vestige).

## What Changed

### Before (CoinGecko)
- Fetched general cryptocurrency data from CoinGecko API
- Required RapidAPI key for access
- Limited to CoinGecko's asset list

### After (Algorand Indexer + DEX)
- Fetches **only Algorand Standard Assets (ASAs)** from Algorand Indexer
- Enriches ASA data with real-time price information from Algorand DEXes
- No API keys required for basic indexer access
- Full transparency into Algorand ecosystem assets

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                         │
│  (cryptocurrencies-list, mini-crypto-table, etc.)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ useGetCryptosQuery()
                     │ useGetCryptoDetailsQuery()
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              cryptoApi (RTK Query Slice)                    │
│  src/app/services/cryptoApi.ts                              │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
             │                      │
             ▼                      ▼
┌────────────────────────┐  ┌──────────────────────────┐
│  Algorand Indexer API  │  │   DEXPriceService        │
│  (ASA metadata)        │  │   (price & volume data)  │
│                        │  │                          │
│  • Asset list          │  │   • Pact DEX             │
│  • Asset details       │  │   • Tinyman DEX          │
│  • Transaction history │  │   • Vestige DEX          │
└────────────────────────┘  └──────────────────────────┘
```

## Environment Variables

### Required

Add these to your `.env.local` file:

```bash
# Algorand Network
NEXT_PUBLIC_ALGORAND_NETWORK=testnet  # or 'mainnet'

# Algorand Indexer URL (optional - defaults to testnet)
NEXT_PUBLIC_ALGORAND_INDEXER_URL=https://testnet-idx.algonode.cloud
```

### Optional (Legacy - No Longer Used)

These can be removed:
```bash
# ❌ No longer needed
NEXT_PUBLIC_CRYPTO_API_URL=...
NEXT_PUBLIC_RAPID_API_KEY=...
NEXT_PUBLIC_CRYPTO_API_HOST=...
```

## API Endpoints

### Algorand Indexer (Public, No Auth Required)

**Base URL (TestNet):** `https://testnet-idx.algonode.cloud`  
**Base URL (MainNet):** `https://mainnet-idx.algonode.cloud`

#### Get Assets List
```
GET /v2/assets?limit=50
```

**Response:**
```json
{
  "assets": [
    {
      "index": 31566704,
      "params": {
        "name": "USD Coin",
        "unit-name": "USDC",
        "decimals": 6,
        "total": 10000000000,
        "creator": "...",
        "url": "https://...",
        ...
      }
    }
  ],
  "current-round": 12345678
}
```

#### Get Asset Details
```
GET /v2/assets/{asset-id}
```

#### Get Asset Transactions
```
GET /v2/assets/{asset-id}/transactions?limit=100
```

### DEX Integration

The `DEXPriceService` (`src/lib/dex-price-service.ts`) provides:

- **Real-time ASA prices** from DEX pools (ALGO/USDC pairs)
- **24h volume** calculations from transaction history
- **Market cap** calculations (price × circulating supply)
- **Price history** aggregated from DEX transactions
- **Liquidity** metrics from pool reserves

#### Supported DEXes (TestNet)

| DEX      | App ID     | Status |
|----------|------------|--------|
| Pact     | 605316866  | ✅ Active |
| Tinyman  | 21580889   | ✅ Active |
| Vestige  | TBD        | 🔄 Coming Soon |

## Key Files Modified

### 1. `/src/app/services/cryptoApi.ts`
**Before:** CoinGecko API integration  
**After:** Algorand Indexer + DEX integration

Key changes:
- Replaced CoinGecko endpoints with Algorand Indexer endpoints
- Added DEX price enrichment via `dexPriceService.getAssetPrice()`
- Transformed ASA data to match existing component interfaces
- Added Algorand-specific fields (creator, decimals, etc.)

### 2. `/src/lib/dex-price-service.ts`
Enhanced with:
- `getPriceHistory()` method for historical price charts
- Improved error handling and caching
- TypeScript fixes for Algorand SDK types

### 3. `/src/app/services/store.js`
- Registered `cryptoApi` in Redux store
- Added cryptoApi reducer and middleware

## Data Transformation

ASAs are transformed to match the existing component interface:

```typescript
{
  uuid: "31566704",              // ASA ID
  id: "31566704",
  rank: 1,                       // Based on market cap
  symbol: "USDC",               // ASA unit-name
  name: "USD Coin",             // ASA name
  price: "1.000000",            // From DEX
  change: "0.12",               // 24h % change
  change1h: "0.05",             // 1h % change
  change7d: "1.23",             // 7d % change
  marketCap: "1000000000",      // price × total supply
  "24hVolume": "50000000",      // From DEX transactions
  supply: {
    circulating: "1000000000",
    total: "1000000000",
    max: "1000000000"
  },
  decimals: 6,                  // Algorand-specific
  creator: "ADDR...",           // Algorand-specific
  isVerified: true,             // Algorand-specific
  isAlgorandASA: true,          // Algorand-specific
}
```

## Known Verified ASAs

The system maintains a list of verified ASAs in `cryptoApi.ts`:

```typescript
const KNOWN_ASSETS = [
  { id: '0', symbol: 'ALGO', name: 'Algorand' },
  { id: '31566704', symbol: 'USDC', name: 'USD Coin' },
  { id: '312769', symbol: 'USDT', name: 'Tether USDt' },
  // Add more verified ASAs here
]
```

To add more verified assets, update this list with the ASA ID from:
- [AlgoExplorer TestNet](https://testnet.algoexplorer.io/)
- [AlgoExplorer MainNet](https://algoexplorer.io/)

## Testing

### 1. Restart Dev Server
```bash
npm run dev
```

### 2. Check Console Logs
Watch for:
- `✅ Asset enrichment success` - DEX price fetching working
- `⚠️ Mock price used` - DEX unavailable, using fallback
- `❌ Error enriching asset` - Problem with specific asset

### 3. Verify Components
Visit these pages:
- `/` - Home page with top cryptocurrencies
- `/cryptocurrencies` - Full asset list with analytics
- `/cryptocurrencies/31566704` - USDC detail page

## Switching Networks

### TestNet (Default)
```bash
NEXT_PUBLIC_ALGORAND_NETWORK=testnet
NEXT_PUBLIC_ALGORAND_INDEXER_URL=https://testnet-idx.algonode.cloud
```

### MainNet
```bash
NEXT_PUBLIC_ALGORAND_NETWORK=mainnet
NEXT_PUBLIC_ALGORAND_INDEXER_URL=https://mainnet-idx.algonode.cloud
```

**⚠️ Important:** Update DEX App IDs in `src/lib/dex-price-service.ts` when switching to MainNet:

```typescript
const DEX_CONFIG = {
  pact: {
    appId: 1002541853,  // MainNet Pact ID
    // ...
  },
  tinyman: {
    appId: 1002541853,  // MainNet Tinyman ID (check official docs)
    // ...
  }
}
```

## Troubleshooting

### Issue: "Module not found: Can't resolve '@/app/services/cryptoApi'"
**Solution:** File was missing. Now created at `src/app/services/cryptoApi.ts`

### Issue: Assets showing $0 price
**Possible causes:**
1. DEX pools not available for that asset on TestNet
2. No recent transactions in DEX
3. Asset not traded on any DEX

**Solution:** System falls back to mock data for development. Check console for `⚠️ Mock price used` messages.

### Issue: No assets showing
**Possible causes:**
1. Algorand Indexer is down
2. Network connectivity issues
3. Invalid API endpoint

**Solution:** Check:
```bash
curl https://testnet-idx.algonode.cloud/health
```

Should return: `{"version":"...", "round":...}`

## Future Enhancements

### Phase 1 (Current) ✅
- [x] Migrate from CoinGecko to Algorand Indexer
- [x] Integrate DEX price data
- [x] Support multiple DEXes (Pact, Tinyman)
- [x] Price history from transactions

### Phase 2 (Planned)
- [ ] Real-time WebSocket price updates
- [ ] Advanced DEX analytics (liquidity, TVL)
- [ ] Asset holder count and distribution
- [ ] DeFi protocol integration (lending, staking)

### Phase 3 (Future)
- [ ] NFT marketplace integration
- [ ] Cross-chain bridge tracking
- [ ] Governance participation metrics
- [ ] AI-powered trading insights

## Resources

### Official Algorand Documentation
- [ASA Overview](https://developer.algorand.org/docs/get-details/asa/)
- [Indexer API Reference](https://developer.algorand.org/docs/rest-apis/indexer/)
- [Algorand SDK](https://developer.algorand.org/docs/sdks/)

### DEX Documentation
- [Pact Finance](https://www.pact.fi/)
- [Tinyman](https://tinyman.org/)
- [Vestige](https://vestige.fi/)

### Tools
- [AlgoExplorer](https://algoexplorer.io/) - Blockchain explorer
- [Pera Wallet](https://perawallet.app/) - Algorand wallet
- [AlgoNode](https://algonode.io/) - Free API access

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Review [Algorand Developer Discord](https://discord.gg/algorand)
3. File an issue in this repository

---

**Last Updated:** October 24, 2025  
**Migration Status:** ✅ Complete  
**Next Steps:** Test on MainNet, add more verified ASAs
