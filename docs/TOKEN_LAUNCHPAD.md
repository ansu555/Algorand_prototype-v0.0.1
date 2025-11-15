# WaveBreak Token Launchpad - User Guide

**A fair-launch platform using bonding curves for transparent, bot-resistant token distribution on Algorand.**

**Last Updated:** 2025-11-15

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Bonding Curve Mechanics](#bonding-curve-mechanics)
4. [Anti-Bot Protection](#anti-bot-protection)
5. [Early Buyer Rewards](#early-buyer-rewards)
6. [User Flow](#user-flow)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**WaveBreak** is a revolutionary fair-launch platform that uses **bonding curves** to ensure transparent price discovery and bot-resistant token distribution on the Algorand blockchain.

### Key Features

✅ **Fair Price Discovery** - Bonding curves eliminate manipulation  
✅ **No Private Sales** - Everyone buys at algorithmically determined prices  
✅ **Anti-Bot Protection** - Cooldown periods, transaction limits, whale penalties  
✅ **Early Buyer Rewards** - 3x → 1x points multiplier based on timing  
✅ **Automated DEX Graduation** - Liquidity pools created automatically  
✅ **30-Day Vesting** - Fair token distribution with linear unlock  
✅ **LP Lock** - 6-month liquidity locks for anti-rug protection

---

## How It Works

### Launch Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WAVEBREAK LAUNCH LIFECYCLE                       │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
            1. Project Creation
                       │
        ┌──────────────▼─────────────┐
        │  Creator Configures:       │
        │  • Token details           │
        │  • Bonding curve type      │
        │  • Pricing (base→max)      │
        │  • Funding target          │
        │  • Liquidity settings      │
        └──────────────┬─────────────┘
                       │
            2. Bonding Curve Phase (Active)
                       │
        ┌──────────────▼─────────────┐
        │  Users Purchase Tokens:    │
        │  • Price determined by     │
        │    progress on curve       │
        │  • Earn points (3x→1x)     │
        │  • Anti-bot checks pass    │
        │  • Contribute to target    │
        └──────────────┬─────────────┘
                       │
            3. Funding Target Reached
                       │
        ┌──────────────▼─────────────┐
        │  Auto-Graduation:          │
        │  • Create DEX pool         │
        │  • Lock 80% liquidity      │
        │  • Enable token trading    │
        │  • Start 30-day vesting    │
        └──────────────┬─────────────┘
                       │
            4. Post-Graduation
                       │
        ┌──────────────▼─────────────┐
        │  • Users claim vested      │
        │    tokens daily            │
        │  • Token tradable on DEX   │
        │  • LP locked for 6 months  │
        │  • Creator receives 20%    │
        │    of raised ALGO          │
        └────────────────────────────┘
```

---

## Bonding Curve Mechanics

### What is a Bonding Curve?

A **bonding curve** is an algorithm that automatically determines token price based on supply. As more tokens are sold, the price increases along the curve.

**Benefits:**
- **Transparent Pricing**: No hidden discounts or insider deals
- **Fair Distribution**: Early supporters benefit, but whales are discouraged
- **Price Discovery**: Market determines fair value organically
- **No Manipulation**: Algorithm cannot be gamed

### Three Curve Types

#### 1. Linear Curve (Steady Growth)

```
Price = basePrice + (maxPrice - basePrice) × progress

Example:
  Base: $0.01, Max: $0.10, Supply: 1,000,000

  Progress    Price
  ────────    ─────
  0%          $0.01
  25%         $0.0325
  50%         $0.055
  75%         $0.0775
  100%        $0.10

Best for: Community tokens, DAOs, stable projects
```

**Visual:**
```
$0.10 ┤                                          ●
      │                                     ●
      │                                 ●
$0.05 ┤                            ●
      │                       ●
      │                  ●
$0.01 ┤●            ●
      └──────────────────────────────────────────
      0%                                      100%
```

#### 2. Exponential Curve (Rapid Acceleration)

```
Price = basePrice × (maxPrice / basePrice) ^ progress

Example:
  Base: $0.01, Max: $0.50, Supply: 1,000,000

  Progress    Price
  ────────    ─────
  0%          $0.01
  25%         $0.033
  50%         $0.105
  75%         $0.280
  100%        $0.50

Best for: Meme coins, speculation plays, viral tokens
```

**Visual:**
```
$0.50 ┤                                          ●
      │                                      ●
      │                                   ●
$0.25 ┤                               ●
      │                          ●
      │                    ●
$0.01 ┤●●●●         ●
      └──────────────────────────────────────────
      0%                                      100%
```

#### 3. Sigmoid Curve (S-Shaped, Balanced)

```
Price = basePrice + (maxPrice - basePrice) × (progress²)

Example:
  Base: $0.01, Max: $0.20, Supply: 1,000,000

  Progress    Price
  ────────    ─────
  0%          $0.01
  25%         $0.0219
  50%         $0.0575
  75%         $0.1168
  100%        $0.20

Best for: Gaming tokens, balanced launches, utility tokens
```

**Visual:**
```
$0.20 ┤                                          ●
      │                                      ●
      │                                  ●
$0.10 ┤                             ●●
      │                        ●●
      │                  ●●
$0.01 ┤●●●●●●     ●
      └──────────────────────────────────────────
      0%                                      100%
```

---

## Anti-Bot Protection

WaveBreak implements **four layers** of anti-bot defenses:

### 1. Cooldown Period

**Mechanism:** 10-block cooldown (~33 seconds) between purchases per wallet

**Purpose:** Prevents rapid bot sniping

**Implementation:**
```typescript
const lastPurchaseRound = await getLastPurchaseRound(userAddress, projectId)
const currentRound = await algodClient.status().do().lastRound
const blocksSinceLastPurchase = currentRound - lastPurchaseRound

if (blocksSinceLastPurchase < 10) {
  throw new Error(`Cooldown active. Please wait ${10 - blocksSinceLastPurchase} blocks.`)
}
```

**User Experience:** ~33 second wait between buys (legitimate users unaffected)

### 2. Per-Transaction Limit

**Mechanism:** Max 1% of total supply per single purchase

**Purpose:** Prevents single whale buys that spike price unfairly

**Implementation:**
```typescript
const maxPerTx = project.totalSupply * 0.01

if (tokenAmount > maxPerTx) {
  throw new Error(`Max ${formatTokens(maxPerTx)} tokens per transaction`)
}
```

**Example:** 1,000,000 supply → max 10,000 tokens per buy

### 3. Per-User Limit

**Mechanism:** Max 5% of total supply per wallet address

**Purpose:** Prevents single wallet dominance, encourages decentralization

**Implementation:**
```typescript
const userTotalBought = await getUserTotalPurchased(userAddress, projectId)
const maxPerUser = project.totalSupply * 0.05

if (userTotalBought + tokenAmount > maxPerUser) {
  throw new Error(`You can only buy up to 5% of total supply`)
}
```

**Example:** 1,000,000 supply → max 50,000 tokens per wallet

### 4. Whale Penalty

**Mechanism:** Purchases >2.5% of supply flagged + reduced point multiplier

**Purpose:** Economically discourages whale behavior

**Implementation:**
```typescript
const isWhale = tokenAmount > (project.totalSupply * 0.025)

if (isWhale) {
  pointsMultiplier = 0.5  // Reduced from early buyer bonus (3x→1x)
  flagAsWhale(userAddress, projectId)
}
```

**Effect:** Whales can still buy, but earn fewer rewards

---

## Early Buyer Rewards

### Points System

Users earn **points** during bonding curve phase. After graduation, points convert to tokens.

**Conversion:** 1 point = 1 launched token

**Vesting:** 30-day linear unlock (daily claims)

### Early Bonus Multiplier

Points earned depend on purchase timing:

```
Multiplier = 3.0 - (progress × 2.0)
```

| Progress | Multiplier | $100 Purchase → Points | $100 Purchase → Tokens (after graduation) |
|----------|-----------|------------------------|------------------------------------------|
| 0-10% sold | 3x | 300 points | 300 tokens |
| 10-25% sold | 2.5x | 250 points | 250 tokens |
| 25-50% sold | 2x | 200 points | 200 tokens |
| 50-75% sold | 1.5x | 150 points | 150 tokens |
| 75-100% sold | 1x | 100 points | 100 tokens |

**Visual:**
```
 3x ┤●
    │  ●●
    │     ●●
 2x ┤        ●●●
    │            ●●●
    │                ●●●●
 1x ┤                     ●●●●●●●●●●●●●●●●●
    └───────────────────────────────────────────────
    0%                  Progress               100%
```

### Vesting Schedule

After graduation:
- Total points convert to tokens
- Unlock linearly over 30 days
- **Daily unlock** = totalPoints / 30
- Users claim unlocked tokens daily via UI

**Example:**
- User earned **1,000 points** during bonding phase
- After graduation: **1,000 tokens** vest over 30 days
- **Day 1:** Can claim ~33.33 tokens
- **Day 2:** Can claim ~33.33 more tokens
- **Day 30:** All 1,000 tokens claimable

---

## User Flow

### For Creators: Launching a Token

#### Step 1: Navigate to Launchpad

Visit `/launchpad` and click **"Launch Token"**

#### Step 2: Configure Token

Fill in token details:

**Token Information:**
- Name (e.g., "Moon Token")
- Symbol (e.g., "MOON")
- Decimals (default: 6)
- Total Supply (e.g., 1,000,000)
- Description
- Logo upload (PNG, JPG, SVG, WebP, max 5MB)
- Social links (website, Twitter, Telegram)

**Bonding Curve Configuration:**
- **Curve Type:** Linear / Exponential / Sigmoid
- **Base Price:** Starting price (e.g., $0.01)
- **Max Price:** Ending price (e.g., $0.10)
- **Funding Target:** ALGO to raise (e.g., 10,000 ALGO)
- **Tokens for Sale:** Tokens available in bonding phase (e.g., 800,000)

**Liquidity Configuration:**
- **DEX Platform:** Tinyman / Pact
- **Liquidity %:** Percentage of raised ALGO for DEX pool (default: 80%)
- **LP Lock Duration:** Lock period for liquidity (default: 6 months)

#### Step 3: Create & Deploy

1. Click **"Create Project"**
2. Transaction sent to Algorand
3. ASA (Algorand Standard Asset) created
4. Bonding curve becomes **Active**
5. Users can now buy tokens

---

### For Buyers: Purchasing Tokens

#### Step 1: Browse Projects

Visit `/launchpad` to see all active launches

**Filters:**
- All / Active / Graduated
- Sort by newest / funding progress

#### Step 2: View Project Details

Click on a project to see:
- Token info (name, symbol, supply)
- Bonding curve chart
- Current price & progress
- Funding status (ALGO raised / target)
- Security badges (anti-bot, LP lock)
- Early buyer multiplier (current)

#### Step 3: Get Price Quote

Enter token amount to buy:
- Live price calculation
- Price impact shown
- Points to earn displayed
- Total cost in ALGO

**Example Quote:**
```
Buy 1,000 MOON tokens

Current Price: $0.045 (45% progress)
Average Price: $0.043
Total Cost: 43 ALGO
Price Impact: 2.3%

Points Earned: 2,150 (2.15x early bonus)
After Graduation: 2,150 MOON tokens (30-day vesting)
```

#### Step 4: Execute Purchase

1. Review quote
2. Click **"Buy Tokens"**
3. Wallet prompts for signature
4. Payment transaction sent (ALGO → Project)
5. Purchase recorded on-chain
6. Points awarded to your account

#### Step 5: Track Progress

- View your points on project page
- See total contributions
- Monitor graduation progress

#### Step 6: Claim Vested Tokens (Post-Graduation)

After project graduates:
1. Visit project page
2. Click **"Claim Vested Tokens"**
3. Daily unlock amount shown
4. Tokens transferred to your wallet

---

## API Endpoints

### Projects API

#### `GET /api/launchpad/projects`

List all launchpad projects

**Query Parameters:**
- `id` (optional): Get single project by ID
- `status` (optional): Filter by status (pending/active/graduated)

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "id": "uuid",
      "tokenName": "Moon Token",
      "tokenSymbol": "MOON",
      "totalSupply": "1000000000000",
      "curveType": "sigmoid",
      "basePrice": "10000",
      "maxPrice": "100000",
      "bondingTarget": "10000000000",
      "status": "active",
      "tokensSold": "450000000000",
      "algoRaised": "4500000000",
      "participantCount": 127,
      "liquidityPercentage": 80,
      "lpLockDuration": "15552000",
      "dexPlatform": "tinyman"
    }
  ]
}
```

#### `POST /api/launchpad/projects`

Create new token launch

**Request Body:**
```json
{
  "creatorAddress": "ALGO_ADDRESS",
  "tokenName": "Moon Token",
  "tokenSymbol": "MOON",
  "totalSupply": "1000000000000",
  "description": "To the moon! 🚀",
  "curveType": "sigmoid",
  "basePrice": "10000",
  "maxPrice": "100000",
  "bondingTarget": "10000000000",
  "tokensForSale": "800000000000",
  "liquidityPercentage": 80,
  "lpLockDuration": "15552000",
  "dexPlatform": "tinyman"
}
```

---

### Purchase API

#### `POST /api/launchpad/purchase`

Handle token purchases (three actions)

**Action: `quote`** - Get price quote

**Request:**
```json
{
  "action": "quote",
  "projectId": "uuid",
  "tokenAmount": "1000000000"
}
```

**Response:**
```json
{
  "success": true,
  "quote": {
    "tokensAmount": "1000000000",
    "algoAmount": "43000000",
    "currentPrice": "45000",
    "avgPrice": "43000",
    "priceImpact": 2.3,
    "earlyBonus": 2.15,
    "pointsEarned": "2150000000"
  }
}
```

**Action: `validate`** - Run anti-bot checks

**Request:**
```json
{
  "action": "validate",
  "projectId": "uuid",
  "userAddress": "ALGO_ADDRESS",
  "tokenAmount": "1000000000",
  "algoAmount": "43000000"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase validated successfully"
}
```

**Action: `record`** - Save completed purchase

**Request:**
```json
{
  "action": "record",
  "projectId": "uuid",
  "userAddress": "ALGO_ADDRESS",
  "tokenAmount": "1000000000",
  "algoAmount": "43000000",
  "txHash": "TRANSACTION_HASH",
  "blockNumber": "12345678"
}
```

**Response:**
```json
{
  "success": true,
  "purchase": {
    "id": "uuid",
    "pointsEarned": "2150000000"
  },
  "graduated": false
}
```

---

### User API

#### `GET /api/launchpad/user`

Get user data

**Action: `points`** - Get user points for project

**Query:**
```
/api/launchpad/user?action=points&projectId=uuid&userAddress=ALGO_ADDRESS
```

**Response:**
```json
{
  "success": true,
  "points": {
    "totalPoints": "5000000000",
    "claimablePoints": "2500000000",
    "claimedPoints": "2500000000"
  }
}
```

**Action: `purchases`** - Get purchase history

**Query:**
```
/api/launchpad/user?action=purchases&projectId=uuid&userAddress=ALGO_ADDRESS
```

**Response:**
```json
{
  "success": true,
  "purchases": [
    {
      "id": "uuid",
      "tokensAmount": "1000000000",
      "algoPaid": "43000000",
      "pricePerToken": "43000",
      "pointsEarned": "2150000000",
      "timestamp": "2025-11-15T12:00:00Z"
    }
  ]
}
```

---

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
