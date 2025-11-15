# Token Launchpad Feature

## Overview

The Token Launchpad is a comprehensive feature that allows users to create, deploy, and manage custom tokens on the Algorand blockchain through the 10xSwap DEX platform.

## Features

### 1. Token Creation
- **Token Information**: Name, symbol, decimals, total supply
- **Logo Upload**: Direct file upload (PNG, JPG, SVG, WebP) up to 5MB - **stored in database as base64**
- **Description**: Detailed token description
- **Social Links**: Website, Twitter, Telegram
- **Initial Price**: Set an initial price in USD

### 2. Token Deployment
- **Algorand ASA Creation**: Deploys tokens as Algorand Standard Assets (ASA)
- **Secure Deployment**: Uses wallet mnemonic for transaction signing
- **Cooldown Period**: 24-hour cooldown after deployment
- **Status Tracking**: Draft → Deployed → Cooldown → Active

### 3. Token Discovery & Filtering
- **Sort Options**:
  - Newest First
  - By Market Cap
- **Filter Options**:
  - All Tokens
  - Passed Cooldown (tokens that completed the cooldown period)
  - My Watchlist (user's favorite tokens)

### 4. Watchlist
- **Personal Watchlist**: Each user can maintain their own watchlist
- **Star/Unstar**: Toggle tokens in watchlist with star icon
- **Database Storage**: Watchlist stored per user address

## User Flow

### Creating a Token

1. **Navigate to Launchpad**
   - Access via: Explore → Launchpad in the header menu
   - Or directly: `/launchpad`

2. **Click "Launch Token"**
   - Opens the token creation form
   - Route: `/launchpad/create`

3. **Fill Token Information**
   - Required fields:
     - Token Name
     - Symbol (auto-uppercase)
     - Decimals (default: 6 for Algorand)
     - Total Supply
   - Optional fields:
     - Logo (upload image file)
     - Description
     - Initial Price (USD)
     - Website URL
     - Twitter URL
     - Telegram URL

4. **Create & Deploy**
   - Click "Create & Deploy" button
   - Logo is uploaded to server (if provided)
   - Token draft is created in database
   - Deploy dialog opens

5. **Deploy to Blockchain**
   - Enter wallet mnemonic (25 words)
   - Click "Deploy Now"
   - Transaction is signed and submitted to Algorand
   - Asset ID is returned
   - Token enters 24-hour cooldown period

### Browsing Tokens

1. **View All Tokens**
   - Browse all launched tokens on the launchpad page
   - See token logo, name, symbol, description
   - View status badges (Draft, Deployed, Cooldown, Active)
   - Check market cap (if available)

2. **Sort & Filter**
   - Sort by newest or market cap
   - Filter by:
     - All Tokens
     - Passed Cooldown
     - My Watchlist

3. **Watchlist Management**
   - Click star icon to add/remove from watchlist
   - Requires connected wallet
   - Watchlist is per-user and persistent

## API Endpoints

### Tokens

#### GET /api/launchpad/tokens
Get all launchpad tokens with filters

**Query Parameters:**
- `status` (optional): Filter by status (draft, deployed, cooldown, active)
- `creatorAddress` (optional): Filter by creator address
- `sortBy` (optional): Sort by 'newest' or 'marketCap'
- `limit` (optional): Limit number of results
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "tokens": [...]
}
```

#### POST /api/launchpad/tokens
Create a new token draft

**Request Body:**
```json
{
  "name": "My Token",
  "symbol": "MTK",
  "decimals": 6,
  "totalSupply": "1000000",
  "creatorAddress": "ALGO_ADDRESS...",
  "description": "Token description",
  "logoPath": "/uploads/logos/uuid.png",
  "website": "https://example.com",
  "twitter": "https://twitter.com/mytoken",
  "telegram": "https://t.me/mytoken",
  "initialPrice": 0.10
}
```

**Response:**
```json
{
  "success": true,
  "token": {...}
}
```

#### GET /api/launchpad/tokens/[id]
Get a specific token by ID

#### PATCH /api/launchpad/tokens/[id]
Update a token

**Request Body:**
```json
{
  "creatorAddress": "ALGO_ADDRESS...",
  "marketCap": 1000000,
  "status": "active"
}
```

#### DELETE /api/launchpad/tokens/[id]
Delete a token (creator only)

**Query Parameters:**
- `creatorAddress`: Creator's wallet address

### Watchlist

#### GET /api/launchpad/watchlist
Get user's watchlist

**Query Parameters:**
- `userAddress`: User's wallet address

**Response:**
```json
{
  "success": true,
  "tokenIds": ["uuid1", "uuid2", ...]
}
```

#### POST /api/launchpad/watchlist
Add token to watchlist

**Request Body:**
```json
{
  "userAddress": "ALGO_ADDRESS...",
  "tokenId": "uuid"
}
```

#### DELETE /api/launchpad/watchlist
Remove token from watchlist

**Query Parameters:**
- `userAddress`: User's wallet address
- `tokenId`: Token ID to remove

### Upload

#### POST /api/launchpad/upload
Upload token logo and convert to base64 for database storage

**Request:** multipart/form-data
- `logo`: Image file (PNG, JPG, SVG, WebP, max 5MB)

**Response:**
```json
{
  "success": true,
  "logoData": "base64_encoded_image_data",
  "logoMimeType": "image/png"
}
```

### Deploy

#### POST /api/launchpad/deploy
Deploy token to Algorand blockchain

**Request Body:**
```json
{
  "tokenId": "uuid",
  "creatorAddress": "ALGO_ADDRESS...",
  "mnemonic": "25-word mnemonic phrase"
}
```

**Response:**
```json
{
  "success": true,
  "assetId": 123456,
  "txId": "TXID...",
  "cooldownEndTime": "2025-11-16T09:29:53.553Z",
  "token": {...}
}
```

## Database Schema

### launchpad_tokens Table

```sql
CREATE TABLE launchpad_tokens (
  id TEXT PRIMARY KEY,
  assetId INTEGER,                    -- Algorand ASA ID
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  totalSupply TEXT NOT NULL,
  creatorAddress TEXT NOT NULL,
  description TEXT,
  logoData TEXT,                      -- Base64-encoded logo stored in database
  logoMimeType TEXT,                  -- MIME type of logo (e.g., image/png)
  website TEXT,
  twitter TEXT,
  telegram TEXT,
  status TEXT NOT NULL,               -- draft, deployed, cooldown, active
  cooldownEndTime TEXT,
  marketCap REAL,
  initialPrice REAL,
  createdAt TEXT NOT NULL,
  deployedAt TEXT
)
```

### token_watchlists Table

```sql
CREATE TABLE token_watchlists (
  id TEXT PRIMARY KEY,
  userAddress TEXT NOT NULL,
  tokenId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(userAddress, tokenId)
)
```

## Security Considerations

1. **Mnemonic Handling**
   - Mnemonic is never stored on the server
   - Only used client-side to sign the deployment transaction
   - Transmitted over HTTPS only

2. **Ownership Verification**
   - Token updates/deletes require creator address verification
   - Watchlist operations require wallet connection

3. **Logo Storage**
   - Logos stored as base64 in database (not as files)
   - File type validation (images only)
   - File size limit (5MB)
   - Converted to base64 during upload for database storage

4. **Asset Creation**
   - Uses Algorand SDK for secure ASA creation
   - Transaction signing happens server-side with provided mnemonic
   - Proper error handling for failed deployments

## Token Lifecycle

1. **Draft**: Token created but not deployed
2. **Deployed**: Token deployed to Algorand, but in cooldown
3. **Cooldown**: 24-hour waiting period after deployment
4. **Active**: Cooldown passed, token is fully active

## Future Enhancements

Potential improvements for the launchpad:

1. **Liquidity Pool Integration**: Automatically create liquidity pool on deployment
2. **Fair Launch**: Support for fair launch mechanisms (Dutch auction, etc.)
3. **Vesting**: Token vesting schedules for team/investors
4. **Marketing Tools**: Built-in marketing dashboard
5. **Analytics**: Token performance tracking and charts
6. **Governance**: DAO creation for token holders
7. **Multi-sig Support**: Multi-signature deployment for team tokens
8. **Token Standards**: Support for different token standards beyond basic ASAs
9. **Cross-chain Bridge**: Bridge tokens to other networks
10. **KYC/AML**: Optional KYC/AML integration for compliance

## Troubleshooting

### Common Issues

**Logo upload fails**
- Check file size (must be < 5MB)
- Verify file type (PNG, JPG, SVG, WebP only)
- Ensure network connection is stable

**Deployment fails**
- Verify mnemonic is correct (25 words)
- Ensure wallet has sufficient ALGO balance for transaction fees
- Check network status (testnet/mainnet)

**Watchlist not updating**
- Ensure wallet is connected
- Check browser console for errors
- Try refreshing the page

**Token not appearing**
- Check filters (may be filtered out)
- Verify token was created successfully
- Check sort order (newest first by default)
