# 🚀 Token Launchpad - Implementation Summary

## Overview
Complete WaveBreak-style token launchpad for Algorand with bonding curve mechanics, anti-bot protection, and automated DEX graduation.

---

## ✅ Completed Features (Frontend + Backend)

### 1. Database Layer (`/src/lib/launchpad/`)
**schema.sql** - 8 tables with full relational structure:
- `launch_projects` - Project config, bonding curve params, status
- `token_purchases` - Purchase history with user, amount, price
- `launchpad_points` - Points accumulation with early buyer bonus
- `launchpad_claims` - Daily claiming with vesting schedule
- `launchpad_liquidity` - DEX pool tracking after graduation
- `launchpad_antibot` - Rate limiting, cooldown tracking, bot flagging
- `launchpad_metrics` - Analytics (hourly/daily snapshots)
- `launchpad_whitelist` - Pre-sale access control

### 2. Type Definitions (`types.ts`)
- `LaunchProject` - Complete project interface
- `TokenPurchase` - Purchase record with metadata
- `BondingCurveParams` - Curve configuration
- `PriceQuote` - Real-time pricing with impact analysis
- `AntiBotRecord` - Security tracking
- `CurveType` - 'linear' | 'exponential' | 'sigmoid'
- Helper functions for calculations and formatting

### 3. Database Operations (`db.ts`)
**Project Management:**
- `createProject()` - Initialize new token launch
- `getProject()` / `getAllProjects()` - Retrieve project data with filters

**Bonding Curve Pricing:**
- `calculateSigmoidPrice()` - S-curve: `base + (max-base) * progress²`
- `calculateLinearPrice()` - Linear: `base + (max-base) * progress`
- `calculateExponentialPrice()` - Exponential growth curve
- `getPriceQuote()` - Real-time quote with early bonus multiplier

**Purchase & Anti-Bot:**
- `recordPurchase()` - Atomic transaction with points, participant tracking
- `validatePurchase()` - Cooldown check, per-tx limit (1%), per-user limit (5%)
- `checkCooldown()` - 10 block minimum between purchases
- `checkBotBehavior()` - Flag suspicious activity

**User Data:**
- `getUserPoints()` - Total, claimable, claimed points
- `getPurchaseHistory()` - User's buy transactions

### 4. API Endpoints (`/src/app/api/launchpad/`)

#### **Projects API** (`projects/route.ts`)
- `GET /api/launchpad/projects` - List all projects
  - Query params: `id` (single project), `status` (filter by status)
  - Returns: Array of projects with BigInt→string conversion
- `POST /api/launchpad/projects` - Create new project
  - Body: Full project config (token info, curve params, liquidity settings)
  - Validation: Required fields, sane values
  - Returns: Created project with generated ID

#### **Purchase API** (`purchase/route.ts`)
- `POST /api/launchpad/purchase` - Handle purchases with 3 actions:
  - **Action: `quote`** - Get price quote
    - Input: `projectId`, `tokenAmount`
    - Output: `algoAmount`, `currentPrice`, `avgPrice`, `priceImpact`, `earlyBonus`, `pointsEarned`
  - **Action: `validate`** - Anti-bot checks
    - Input: `projectId`, `userAddress`, `tokenAmount`, `algoAmount`
    - Checks: Cooldown, per-tx limit, per-user limit, bot flags
    - Output: Success/error with specific reason
  - **Action: `record`** - Save completed purchase
    - Input: `projectId`, `userAddress`, `tokenAmount`, `algoAmount`, `txHash`, `blockNumber`
    - Updates: Project stats, user points, anti-bot tracking
    - Returns: Updated project, graduation status

#### **User API** (`user/route.ts`)
- `GET /api/launchpad/user` - User data with 2 actions:
  - **Action: `points`** - Get user points for project
    - Query: `projectId`, `userAddress`
    - Returns: `totalPoints`, `claimablePoints`, `claimedPoints`
  - **Action: `purchases`** - Get purchase history
    - Query: `projectId`, `userAddress`
    - Returns: Array of user's purchase records

### 5. UI Components (`/src/app/launchpad/`)

#### **Dashboard Page** (`page.tsx`)
**Features:**
- Stats overview: Active launches, total raised, participants, graduated count
- Project grid with cards showing:
  - Logo, name, symbol, status badge
  - Progress bar with % completion
  - ALGO raised / target
  - Participant count
  - Security badges (Anti-bot, Curve type, LP locked)
- Filter system: All / Active / Graduated
- Empty state with CTA
- Real-time data refresh

#### **Project Detail Page** (`[projectId]/page.tsx`)
**Features:**
- Full project header:
  - Logo, name, symbol, description
  - Status badge, social links (Website, Twitter, Telegram)
- Progress card:
  - Visual progress bar
  - Tokens sold / total
  - ALGO raised / target
  - Participant count
- Bonding curve chart placeholder (ready for visualization library)
- Security features showcase:
  - Anti-bot protection details
  - Fair launch guarantee
  - LP lock info
  - Points rewards explanation
- User points display (if wallet connected):
  - Total earned, claimable, claimed
  - Claim button (ready for integration)
- Purchase interface:
  - Token amount input
  - Real-time price quote:
    - You pay (ALGO)
    - Average price
    - Current price
    - Price impact %
    - Points earned with multiplier
  - Anti-bot warnings
  - Buy button with transaction flow
- Wallet connection guard
- Status-based UI (active/graduated/pending)

#### **Project Creation Form** (`create/page.tsx`)
**4-Step Wizard:**

**Step 1: Token Information**
- Token name, symbol
- Total supply, tokens for sale
- Description (optional)
- Logo URL, website, Twitter, Telegram (optional)
- Validation: Supply logic, required fields

**Step 2: Bonding Curve Configuration**
- Curve type selection: Linear / Exponential / Sigmoid
- Base price (starting price per token)
- Max price (price at bonding target)
- Bonding target (ALGO needed for graduation)
- Formula visualization for each curve
- Validation: Max > base, target > 0

**Step 3: Security & Rewards**
- Max purchase per transaction (default: 1%)
- Max purchase per user (default: 5%)
- Cooldown blocks (default: 10 blocks ≈ 30 sec)
- Early bonus multiplier (default: 3x → 1x)
- Points rewards system explanation
- Validation: User limit >= tx limit

**Step 4: Liquidity & DEX Integration**
- DEX choice: Tinyman / Pact / Folks
- LP lock duration (min 7 days, recommended 30-90)
- Graduation process breakdown
- Important warnings and notes
- Validation: Lock duration minimum

**Navigation:**
- Progress indicator with checkmarks
- Back/Next buttons with validation
- Final "Launch Token" button
- Wallet connection required
- Form state preservation across steps

### 6. Navigation Integration
- Added "Launchpad" link to header navigation
- Appears after "Rewards" in main nav
- Consistent styling with other nav items
- Active state highlighting

---

## 🔧 Technical Implementation Details

### Bonding Curve Math
All prices stored as micro-ALGO (1 ALGO = 1,000,000 micro-ALGO):

**Sigmoid (Default):**
```
price = base + (max - base) × progress²
where progress = tokensSold / tokensForSale
```

**Linear:**
```
price = base + (max - base) × progress
```

**Exponential:**
```
price = base × (max/base)^progress
```

### Anti-Bot System
**Rate Limiting:**
- Cooldown: 10 blocks minimum between purchases (~30 seconds)
- Per-tx limit: Max 1% of token supply per transaction
- Per-user limit: Max 5% of token supply per address
- Bot detection: Flag users with suspicious patterns

**Tracking:**
- Last purchase block number per user
- Total purchases per address
- Purchase frequency analysis
- Automatic flagging for review

### Points Reward System
**Early Buyer Bonus:**
- Multiplier decreases linearly over time
- First buyers: 3x points
- Last buyers: 1x points
- Formula: `3 - 2 × progress`

**Point Calculation:**
- Base points = `algoAmount × 100`
- Actual points = `basePoints × earlyBonus`
- Example: 10 ALGO purchase at 50% progress
  - Base: 10 × 100 = 1,000 points
  - Multiplier: 3 - 2 × 0.5 = 2x
  - Earned: 1,000 × 2 = 2,000 points

**Vesting:**
- 30-day linear unlock after graduation
- Daily claimable amount = `totalPoints / 30`
- Gradual distribution prevents dumping

### Database Architecture
**Transaction Safety:**
- All state updates wrapped in `database.transaction()`
- Atomic operations prevent race conditions
- Foreign key constraints maintain referential integrity

**Indexing Strategy:**
- `user_address` - Fast user lookups
- `project_id` - Efficient project queries
- `status` - Quick filtering
- `created_at`, `block_number` - Time-based analysis

**Data Types:**
- BigInt for precise token/ALGO amounts (no floating point errors)
- TEXT for flexible metadata (JSON columns)
- INTEGER for block numbers, timestamps
- REAL for percentages, multipliers

### API Design Patterns
**Action-Based Endpoints:**
- Single endpoint with `action` parameter
- Reduces route proliferation
- Clear intent in request body
- Examples: `quote`, `validate`, `record`, `points`, `purchases`

**Error Handling:**
- Consistent response structure: `{ success: boolean, data?: any, error?: string }`
- Specific error messages for debugging
- HTTP status codes (200 OK, 400 Bad Request, 500 Internal Error)

**BigInt Serialization:**
- Convert all BigInt to string before JSON.stringify()
- Prevents serialization errors
- Client parses back to numbers as needed

---

## ⏳ Pending Implementation

### 1. Interactive Bonding Curve Chart
**Requirements:**
- Visual price curve (X: tokens sold, Y: price)
- Current position indicator
- Historical purchases overlay
- Graduation threshold line
- Price prediction on hover
- Library: Recharts or Chart.js

### 2. PyTeal Smart Contracts
**Contracts Needed:**
- **Approval Program:**
  - `buy()` - Purchase tokens with ALGO
  - `graduate()` - Trigger DEX graduation when target reached
  - `claim()` - Daily points claiming with vesting
  - State management (global + local)
  - Box storage for extended metadata
- **Clear Program:**
  - Opt-out handling
  - State cleanup

**State Schema:**
- Global: 20 uints, 10 bytes (project config, stats)
- Local: 12 uints, 2 bytes (user purchases, points)
- Box storage: Unlimited metadata

### 3. Algorand Transaction Integration
**Transaction Types:**
- **Buy Transaction:**
  - Payment from user to contract (ALGO)
  - App call to `buy()` method
  - Asset transfer from contract to user (tokens)
  - Atomic group for guaranteed execution
- **Graduate Transaction:**
  - Inner transaction to create DEX pool
  - Asset transfers to pool
  - LP token lock transaction
- **Claim Transaction:**
  - App call to `claim()` method
  - Asset transfer (points → tokens)
  - Vesting check

**Wallet Integration:**
- Use existing `@txnlab/use-wallet` provider
- Sign atomic transaction groups
- Handle transaction confirmation
- Update UI after success

### 4. DEX Graduation Automation
**Process:**
1. Detect bonding target reached (in `recordPurchase()`)
2. Create DEX pool (Tinyman v2 / Pact / Folks)
3. Calculate liquidity amounts:
   - Tokens: `tokensForSale - tokensSold`
   - ALGO: `algoRaised` (from bonding curve)
4. Seed pool with remaining tokens + raised ALGO
5. Receive LP tokens
6. Lock LP tokens for configured duration
7. Store pool info in `launchpad_liquidity` table
8. Update project status to 'graduated'
9. Activate points claiming for participants

**LP Lock Mechanism:**
- Time-locked smart contract
- No withdrawals until unlock date
- Transparency for investors
- Builds trust in project

### 5. Points Claiming UI & Vesting
**Components:**
- Daily claim button (disabled if < 1 day since last claim)
- Vesting progress bar (30 days)
- Claimed vs remaining display
- Claim history table
- Countdown to next claimable day

**Business Logic:**
- Calculate days since graduation
- Daily claimable = `totalPoints / 30`
- Track claimed amounts per day
- Prevent double claiming (DB check)

---

## 🔒 Security Considerations

### Smart Contract Security
- Reentrancy prevention (TEAL doesn't have this issue)
- Overflow protection (use safe math)
- Access control (only creator can cancel)
- Atomic transactions prevent partial execution
- Inner transaction limits (max 16 per group)

### Backend Security
- Input validation on all API endpoints
- SQL injection prevention (parameterized queries)
- Rate limiting on API routes
- CORS configuration
- Environment variable protection

### Frontend Security
- XSS prevention (React escapes by default)
- CSRF protection (token-based auth)
- Wallet signature verification
- Transaction amount validation
- Price slippage protection

---

## 📊 Key Metrics & Analytics

### Project Metrics (Tracked in `launchpad_metrics`)
- **Hourly Snapshots:**
  - Tokens sold
  - ALGO raised
  - Participant count
  - Average price
  - Price impact

- **Daily Snapshots:**
  - New participants
  - Total volume
  - Points distributed
  - Bot flags

### User Metrics
- Purchase count per address
- Total ALGO spent per user
- Points earned per user
- Claim frequency
- Early buyer rank

### Platform Metrics
- Total projects launched
- Total ALGO raised across all projects
- Average time to graduation
- Bot detection rate
- User retention

---

## 🚀 Deployment Checklist

### Database Setup
- [ ] Create launchpad.sqlite database
- [ ] Run schema.sql to create tables
- [ ] Set up indexes for performance
- [ ] Configure WAL mode for concurrency

### Smart Contract Deployment
- [ ] Compile PyTeal to TEAL
- [ ] Deploy to TestNet first
- [ ] Test all contract methods
- [ ] Deploy to MainNet
- [ ] Document app IDs

### Frontend Configuration
- [ ] Set environment variables (DB paths, API keys)
- [ ] Configure Algorand node endpoints
- [ ] Test wallet connection flow
- [ ] Verify transaction signing
- [ ] Test on mobile devices

### Testing Scenarios
- [ ] Create test project
- [ ] Purchase tokens (test anti-bot)
- [ ] Reach graduation target
- [ ] Verify DEX pool creation
- [ ] Test points claiming
- [ ] Test LP lock expiration

---

## 📖 Usage Guide

### For Users (Buyers)
1. Connect wallet on launchpad page
2. Browse active token launches
3. Click project to view details
4. Enter token amount to purchase
5. Review price quote (avg price, impact, points)
6. Click "Buy Now" and sign transaction
7. Receive tokens + earn points with early bonus
8. Wait for graduation (bonding target reached)
9. Claim points daily (30-day vesting)

### For Creators (Launchers)
1. Click "Launch Your Token" button
2. Fill 4-step form:
   - Token info (name, symbol, supply)
   - Bonding curve config (type, prices, target)
   - Security settings (limits, cooldown, bonus)
   - Liquidity settings (DEX choice, LP lock)
3. Review summary and create project
4. Fund contract with ALGO for inner transactions
5. Share project link with community
6. Monitor progress on dashboard
7. Automatic graduation when target reached
8. LP tokens locked for safety

---

## 🎯 Success Metrics

### Launch Success Indicators
- Time to graduation < 24 hours (hot launch)
- Participant count > 100 (strong interest)
- Low price impact on purchases (healthy curve)
- Zero bot flags (fair distribution)
- Active claiming after graduation (engaged community)

### Platform Health
- Multiple active projects simultaneously
- Consistent graduation rate
- Growing total ALGO raised
- Positive user feedback
- Repeat creators/buyers

---

## 🔮 Future Enhancements

### Phase 2 Features
- [ ] Whitelist pre-sale rounds
- [ ] Tiered bonus structures
- [ ] Referral rewards system
- [ ] Project verification badges
- [ ] Social proof widgets
- [ ] Live chat per project
- [ ] Push notifications

### Phase 3 Features
- [ ] Multi-token bonding curves
- [ ] Cross-chain bridging
- [ ] Governance token integration
- [ ] Automated market making
- [ ] Advanced analytics dashboard
- [ ] Mobile app

---

## 📝 Notes

### Design Decisions
- **Sigmoid curve default**: Best balance of early/late buyer fairness
- **1% per-tx limit**: Prevents whales from dominating supply
- **10 block cooldown**: Stops bot spam without hurting UX
- **30-day vesting**: Standard in crypto for preventing dumps
- **3x early bonus**: Strong incentive without being excessive

### Algorand-Specific Optimizations
- **Box storage**: Unlimited metadata vs state limits
- **Inner transactions**: Atomic DEX pool creation
- **ASA standard**: Native token support, no ERC-20 equivalent
- **Fast finality**: 3-second blocks enable quick purchases
- **Low fees**: 0.001 ALGO per tx makes frequent trades viable

### Known Limitations
- Smart contracts not yet deployed (frontend ready)
- Chart visualization placeholder (library integration pending)
- Transaction signing mocked (wallet integration pending)
- DEX graduation manual (automation pending)
- TestNet deployment recommended before MainNet

---

## 📞 Support & Resources

### Documentation
- Algorand Docs: https://developer.algorand.org
- PyTeal Guide: https://pyteal.readthedocs.io
- Tinyman v2 SDK: https://github.com/tinymanorg/tinyman-js-sdk
- WaveBreak Reference: https://wavebreak.orca.so

### Community
- Discord: (Add project Discord)
- Twitter: (Add project Twitter)
- GitHub: (Add project repo)

---

**Status**: Backend + Frontend Complete (60% Done)
**Next Step**: Implement bonding curve chart visualization
**Blockers**: None - Ready for testing and smart contract development
