# X Token Economics & Rewards System

**Comprehensive guide to the X Token utility, distribution, rewards system, and platform economics.**

**Last Updated:** 2025-11-15

---

## Table of Contents

1. [Introduction](#introduction)
2. [X Token Overview](#x-token-overview)
3. [Token Distribution](#token-distribution)
4. [Token Utility](#token-utility)
5. [Rewards System Mechanics](#rewards-system-mechanics)
6. [Staking System](#staking-system-coming-soon)
7. [Prediction Markets](#prediction-markets-future)
8. [Launchpad Integration](#launchpad-integration)
9. [Token Economics](#token-economics)
10. [Governance](#governance-future)

---

## Introduction

X Token is the native utility token of the 10xSwap ecosystem, designed to reward active participation, enable governance, and provide exclusive platform benefits. The token creates a sustainable economic model that aligns user incentives with platform growth.

### Core Principles

- **Earn-to-Trade**: Users earn X tokens through platform activities
- **Progressive Rewards**: Higher engagement leads to better rewards
- **Gamification**: Quests, levels, streaks, and badges make DeFi engaging
- **Fair Distribution**: No pre-mine, no VCs, purely merit-based rewards
- **Deflationary Mechanisms**: Fee burns and liquidity locks reduce supply over time

---

## X Token Overview

### Token Properties

| Property | Value |
|----------|-------|
| **Token Name** | X Token |
| **Symbol** | X |
| **Blockchain** | Algorand (ASA) |
| **Decimals** | 6 |
| **Initial Supply** | 1,000,000,000 (1 billion) |
| **Max Supply** | No hard cap (inflationary with burn mechanisms) |
| **Initial Distribution** | 100% via rewards (no pre-mine) |
| **TestNet ASA ID** | [750589647](https://testnet.algoexplorer.io/asset/750589647) |
| **Treasury Address** | 5IZJEVVOAVXOVCN35JQ5PBDBDAPEBUTKST7GDGUGEBP5QNY7S5YWDYSME4 |

### Token Standard

X Token is an **Algorand Standard Asset (ASA)** with the following features:
- Fast transactions (sub-3 second finality)
- Low fees (~0.001 ALGO per transaction)
- Carbon-neutral blockchain
- Native clawback protection disabled (decentralized)
- Freeze functionality disabled (fully transferable)

### Deployment

To deploy the X Token on Algorand TestNet:

```bash
# Ensure DEPLOYER_MNEMONIC is set in .env.local
npx ts-node scripts/deploy-x-token.ts
```

After deployment, update `.env.local` with:
```bash
NEXT_PUBLIC_X_TOKEN_ASA_ID=<deployed_asa_id>
X_TOKEN_TREASURY_ADDRESS=<deployer_address>
ENABLE_X_TOKEN_DISTRIBUTION=true
```

### Treasury Allocation

| Pool | Percentage | Tokens | Purpose |
|------|------------|--------|---------|
| Rewards Pool | 70% | 700,000,000 | User quest rewards |
| Liquidity Mining | 15% | 150,000,000 | LP incentives |
| Development | 10% | 100,000,000 | Platform operations |
| Reserve | 5% | 50,000,000 | Future use |

---

## Token Distribution

### Earning Methods

#### 1. Quest Completion (Primary Source)
Users earn X tokens by completing various quests:

**Onboarding Quests:**
- Connect Wallet: **10 X**
- First Swap: **25 X**
- First Liquidity: **40 X**
- First Auto-Pilot Rule: **30 X**

**Milestone Quests:**
- 5 Swaps: **50 X**
- 25 Swaps: **150 X**
- 100 Swaps: **500 X**
- 500 Swaps: **1,500 X**

**Daily Quests:**
- Daily Login: **5 X**
- Daily Swap: **10 X**
- Daily Liquidity Check: **8 X**

**Weekly Quests:**
- 20 Swaps This Week: **100 X**
- Add $100+ Liquidity: **200 X**
- Create 3 Auto-Pilot Rules: **150 X**

**Achievement Quests:**
- Trading Volume $10,000+: **500 X**
- Trading Volume $50,000+: **2,500 X**
- 90 Day LP Holder: **1,000 X** + Diamond Hands Badge

#### 2. Streak Multipliers
Daily login streaks multiply quest rewards:

| Streak Days | Multiplier | Total Bonus |
|-------------|------------|-------------|
| 1-6 days | 1x | Base rewards |
| 7-13 days | 1.5x | +50% |
| 14-29 days | 2x | +100% |
| 30+ days | 3x | +200% |

**Example:** Daily Login normally awards 5 X. With a 30-day streak: **5 X × 3 = 15 X**

#### 3. Referral Rewards
Invite friends and earn rewards when they trade:

- **Per Referral Signup**: 50 X
- **Friend's First Swap**: 25 X bonus
- **10% of Friend's Quest Rewards**: Lifetime earnings
- **Referral Milestones**:
  - 5 referrals: 100 X bonus
  - 10 referrals: 500 X bonus + Social Butterfly Badge
  - 25 referrals: 2,000 X bonus
  - 50 referrals: 5,000 X bonus + Influencer Badge

#### 4. Badge Bonuses
Unlock badges to earn permanent multipliers:

| Badge | Requirement | One-Time Reward | Permanent Bonus |
|-------|-------------|-----------------|-----------------|
| Early Adopter 🥇 | Join in first month | 500 X | +10% all rewards |
| Diamond Hands 💎 | 90+ day LP holder | 1,000 X | +5% all rewards |
| Whale Watcher 🐋 | $50,000+ volume | 2,500 X | - |
| Master Trader 🏆 | 500+ swaps | 1,500 X | - |
| Automation Expert 🤖 | 50+ agent executions | 800 X | - |
| Social Butterfly 🦋 | 10+ referrals | 1,000 X | +2% referral rewards |

#### 5. Launchpad Participation
Early buyers in WaveBreak token launches earn bonus X tokens:

- **Early Buyer Bonus**: 3x → 1x multiplier based on purchase timing
- **Example**: Buy $100 in first 10% of launch = 300 X points
- **Graduation Conversion**: Points convert to launched tokens (1:1 ratio)
- **30-Day Vesting**: Tokens unlock linearly over 30 days

#### 6. Mystery Boxes (Future)
Random X token rewards for active users:
- Daily chance after completing 3+ quests
- Rewards: 10-1,000 X (weighted distribution)
- Ultra-rare: Legendary badges + 5,000 X

---

## Token Utility

### 1. Reduced Trading Fees (Future)

| User Tier | X Tokens Held | Fee Discount |
|-----------|---------------|--------------|
| Bronze | 0-999 X | 0% (baseline 0.3%) |
| Silver | 1,000-4,999 X | 10% (0.27%) |
| Gold | 5,000-19,999 X | 25% (0.225%) |
| Platinum | 20,000-49,999 X | 50% (0.15%) |
| Diamond | 50,000+ X | 75% (0.075%) |

### 2. Staking Rewards (Coming Soon)

Stake X tokens to earn passive income:

**Base Staking APY: 15%**

Lock periods with multipliers:
- **No Lock** (flexible): 15% APY
- **30 Days**: 18% APY (+3%)
- **90 Days**: 22% APY (+7%)
- **180 Days**: 28% APY (+13%)
- **365 Days**: 40% APY (+25%)

**VIP Staking Benefits:**
- Priority access to new token launches
- Exclusive governance proposals
- Higher referral commission (15% vs 10%)
- Reduced gas fees on swaps
- Early access to prediction markets

### 3. Governance Voting (Future)

X token holders can vote on:
- Protocol fee adjustments
- New DEX integrations
- Launchpad project curation
- Feature roadmap priorities
- Treasury fund allocation

**Voting Power:** 1 X token = 1 vote
**Delegation:** Vote delegation to trusted community members
**Proposal Threshold:** 10,000 X to submit proposals

### 4. Prediction Market Participation (Future)

Use X tokens to participate in prediction markets:

**Market Types:**
- Token launch success/failure predictions
- Price targets for new launches
- Trading volume predictions
- DEX liquidity growth

**Mechanics:**
- Stake X tokens on outcomes
- Correct predictions earn pool rewards
- Incorrect predictions forfeit stake
- Market makers earn fees

### 5. Launchpad Early Access (Future)

Premium tier holders get:
- **6-hour early access** to new launches (Diamond tier)
- **3-hour early access** (Platinum tier)
- **Allocation guarantees** for high-demand launches
- **Reduced fees** on launchpad purchases

---

## Rewards System Mechanics

### Level Progression

Users level up by earning Experience Points (XP):

**Level 1-10** (Beginner):
- Level 1: 0 XP
- Level 5: 1,000 XP
- Level 10: 11,000 XP

**Level 11-20** (Intermediate):
- Level 15: 41,000 XP
- Level 20: 96,000 XP

**Level 21-30** (Expert):
- Level 25: 176,000 XP
- Level 30: 281,000 XP

**XP Sources:**
- Quest completion: 1 XP per 1 X earned
- Daily login: 5 XP
- Swaps: 10 XP each
- LP positions: 50 XP per day active
- Auto-Pilot executions: 15 XP each

**Level Benefits:**
- **Level 5**: Unlock weekly quests
- **Level 10**: Unlock achievement quests
- **Level 15**: Unlock referral bonuses
- **Level 20**: Unlock prediction markets
- **Level 25**: Unlock governance proposals
- **Level 30**: Unlock legendary quests (5,000 X rewards)

### Quest System

#### Quest Types

**Daily Quests** (24-hour expiry):
- Reset at 00:00 UTC
- Simple, achievable goals
- Moderate rewards (5-20 X)
- Build streaks

**Weekly Quests** (7-day expiry):
- Reset Monday 00:00 UTC
- Require sustained activity
- Higher rewards (100-300 X)
- Bonus for completing all weekly quests (+20%)

**Milestone Quests** (permanent):
- One-time achievements
- Tracked across account lifetime
- High rewards (25-2,500 X)
- Unlock badges

**Achievement Quests** (permanent):
- Rare, difficult challenges
- Elite status markers
- Very high rewards (500-5,000 X)
- Grant legendary badges

**Social Quests** (ongoing):
- Twitter engagement
- Discord participation
- Community contributions
- Variable rewards based on impact

#### Quest Tracking

Quests auto-track user actions via event system:

```typescript
// Example: Swap completion
trackAction(userId, 'swap', {
  fromAsset: USDC,
  toAsset: ALGO,
  volume: 100 ALGO
})

// Backend updates progress for:
// - "Complete a swap" quest
// - "5 swaps" milestone quest
// - "Daily swap" quest
// - "Trade $100+ volume" quest
```

**Database Schema:**
- `user_actions` table logs all trackable events
- `quest_progress` table stores per-user quest state
- Efficient indexing for real-time updates

### Streak Mechanics

**Streak Rules:**
- Login within 24 hours to maintain streak
- Miss a day = streak resets to 0
- Streak multiplier applies to ALL quest rewards
- Longest streak is permanently recorded

**Streak Shields (Future):**
- **Bronze Shield**: 1 streak protection (costs 100 X)
- **Silver Shield**: 3 streak protections (costs 500 X)
- **Gold Shield**: 7 streak protections (costs 1,500 X)

### Badge System

**Badge Rarities:**

| Rarity | Color | Droprate | XP Bonus |
|--------|-------|----------|----------|
| Common | Gray | 50% | +10 XP |
| Rare | Blue | 30% | +50 XP |
| Epic | Purple | 15% | +200 XP |
| Legendary | Gold | 5% | +1,000 XP |

**Badge Categories:**
- **Trading**: Volume, swap count, multi-DEX usage
- **Liquidity**: LP duration, TVL milestones
- **Automation**: Auto-Pilot usage, complex strategies
- **Social**: Referrals, community engagement
- **Veteran**: Early adopter, loyalty, longevity
- **Special**: Event participation, hackathons, airdrops

**Badge Display:**
- Profile page badge showcase (up to 6 featured)
- Leaderboard next to username
- Quest completion notifications

---

## Staking System (Coming Soon)

### Overview

Stake X tokens to earn passive APY while retaining platform benefits.

### Staking Mechanics

**Flexible Staking:**
- No lock period
- Withdraw anytime
- Rewards compound daily
- 15% base APY

**Fixed-Term Staking:**
- Choose 30/90/180/365 day lock
- Higher APY multipliers
- Early withdrawal penalty (10% of rewards)
- Bonus XP for completing lock period

**Staking Rewards Pool:**
- Funded by platform trading fees (20%)
- Refilled via X token emissions (capped)
- Sustainable APY targeting 15-40% range

### VIP Tiers (Stake-Based)

| Tier | Staked Amount | Benefits |
|------|---------------|----------|
| VIP Bronze | 1,000 X (90 days) | 5% fee discount, priority support |
| VIP Silver | 5,000 X (90 days) | 10% fee discount, early launch access |
| VIP Gold | 20,000 X (180 days) | 25% fee discount, governance voting |
| VIP Platinum | 50,000 X (180 days) | 50% fee discount, exclusive quests |
| VIP Diamond | 100,000 X (365 days) | 75% fee discount, DAO council seat |

### Staking Dashboard

Features:
- Total staked amount
- Current APY
- Estimated daily earnings
- Unclaimed rewards
- Lock expiry countdown
- Re-stake with compounding option

---

## Prediction Markets (Future)

### Overview

Use X tokens to predict outcomes of token launches, price movements, and protocol events.

### Market Types

#### 1. Token Launch Predictions
**Question:** Will [TOKEN] reach $X market cap within 7 days?
- **Yes Pool**: Users stake X predicting success
- **No Pool**: Users stake X predicting failure
- **Resolution**: On-chain oracle checks market cap at day 7
- **Payout**: Winning pool shares losing pool's X tokens (minus 2% platform fee)

#### 2. Price Oracle Predictions
**Question:** Will ALGO be above $0.30 on [DATE]?
- Binary yes/no outcome
- Price sourced from Algorand DEX aggregator
- Automated resolution

#### 3. Volume Predictions
**Question:** Will 10xSwap process $1M+ volume this week?
- Platform analytics provide data
- Weekly resolution cycle
- Bonus X rewards for accurate predictors

### Prediction Mechanics

**Market Creation:**
- DAO proposes markets via governance
- 1,000 X fee to create custom markets
- 72-hour voting period

**Staking:**
- Minimum stake: 10 X
- Maximum stake: 10,000 X per user per market
- Positions locked until resolution

**Resolution:**
- Automated via oracles (price, volume)
- Manual via DAO vote (subjective outcomes)
- Dispute mechanism (24-hour challenge window)

**Rewards:**
- Correct predictions: Share of losing pool
- Market makers (liquidity providers): 0.5% fee share
- Early predictors: 10% bonus on winnings

**Leaderboard:**
- Track win rate, total X won, accuracy %
- Monthly top 10 get bonus X rewards
- Legendary badges for 80%+ win rate over 20+ markets

---

## Launchpad Integration

### WaveBreak Points System

When users buy tokens on the WaveBreak launchpad, they earn **points** that later convert to launched tokens.

#### Early Buyer Bonus

Points multiplier based on purchase timing:

| Progress | Multiplier | Example ($100 buy) |
|----------|------------|---------------------|
| 0-10% sold | 3x | 300 points |
| 10-25% sold | 2.5x | 250 points |
| 25-50% sold | 2x | 200 points |
| 50-75% sold | 1.5x | 150 points |
| 75-100% sold | 1x | 100 points |

**Calculation:**
```typescript
const progress = tokensSold / totalSupply
const earlyBonus = 3.0 - (progress * 2.0) // Linear decay from 3x to 1x
const pointsEarned = purchaseAmount * earlyBonus
```

#### Points-to-Token Conversion

After token graduates to DEX:
- **1 point = 1 launched token**
- Points automatically vest over 30 days
- **Daily unlock**: totalPoints / 30
- Users claim daily unlocked tokens via UI

**Example:**
- User earned 1,000 points during launch
- After graduation: 1,000 tokens vest over 30 days
- Day 1: Can claim ~33.33 tokens
- Day 30: All 1,000 tokens claimable

#### Anti-Bot Protection

Points system includes bot mitigation:

**Cooldown Period:**
- 10 blocks (~33 seconds) between purchases
- Prevents rapid bot sniping
- Legitimate users unaffected

**Per-Transaction Limit:**
- Max 1% of total supply per purchase
- Prevents whale dominance
- Encourages fair distribution

**Per-User Limit:**
- Max 5% of total supply per wallet
- Prevents Sybil attacks
- Promotes decentralization

**Whale Penalty:**
- Purchases >2.5% of supply flagged
- Reduced point multiplier (0.5x instead of early bonus)
- Still allowed, but discouraged

#### Launchpad Rewards Integration

**Quest Synergy:**
- "Participate in Token Launch": 100 X
- "Buy $50+ in Launchpad": 200 X
- "Hold Launched Tokens 30 Days": 500 X + Diamond Hands badge

**XP from Launchpad:**
- 50 XP per $10 spent in launchpad
- 100 XP for completing vesting period
- 500 XP for providing liquidity to graduated token

---

## Token Economics

### Supply Mechanics

#### Inflationary Model (Current)
- **No max supply**: X tokens mint as rewards
- **Emission rate**: ~100,000 X per day (early phase)
- **Decay curve**: Emission reduces 10% every 6 months
- **Long-term target**: 1,000,000 X total supply cap (reached ~2027)

#### Deflationary Mechanisms (Future)

**Fee Burns:**
- 10% of trading fees used to buy & burn X
- Quarterly burn events
- Transparent on-chain tracking

**Launchpad Burns:**
- 5% of launchpad creation fees burned
- Reduces circulating supply

**Governance Burns:**
- Proposal deposits burned if proposal fails
- Spam prevention

### Fee Structure

| Action | Fee | X Token Holder Discount |
|--------|-----|-------------------------|
| Swap (DEX) | 0.3% | Up to 75% off |
| Add Liquidity | 0% | - |
| Remove Liquidity | 0% | - |
| Launchpad Create | 10 ALGO | - |
| Launchpad Buy | 1% | 50% off with 5,000+ X |
| Auto-Pilot Execute | 0.5% | 25% off with 1,000+ X |
| Prediction Market | 2% | 1% with 10,000+ X |

### Treasury Allocation (Future)

Platform fees distributed:
- **40%**: Staking rewards pool
- **30%**: Development fund
- **20%**: Marketing & growth
- **10%**: DAO treasury (governance controlled)

### Tokenomics Metrics (Projected Year 1)

| Metric | Target |
|--------|--------|
| Total X Distributed | 500,000 X |
| Active X Holders | 5,000+ |
| Staking Participation | 60% of supply |
| Average Hold Time | 90 days |
| Quest Completion Rate | 45% |
| Referral Network Growth | 2,000+ referrals |

---

## Governance (Future)

### Proposal System

**Proposal Types:**
1. **Parameter Changes** (e.g., fee adjustments)
2. **Feature Requests** (e.g., new DEX integrations)
3. **Treasury Spending** (e.g., marketing budgets)
4. **Launchpad Curation** (e.g., project approvals)
5. **Emergency Actions** (e.g., pause protocol)

**Proposal Lifecycle:**
1. **Draft**: Community discussion (forum/Discord)
2. **Submission**: 10,000 X deposit required
3. **Voting Period**: 7 days
4. **Execution**: Automatic if passed (>50% yes, 10% quorum)
5. **Deposit Return**: If passed, else burned

### Voting Mechanics

**Voting Power:**
- 1 X token = 1 vote
- Staked X = 1.5 votes (bonus for commitment)
- Locked staking (365 days) = 2 votes

**Delegation:**
- Delegate voting power to experts
- Maintain ownership of tokens
- Revoke delegation anytime

**Quadratic Voting (Advanced):**
- Square root of X holdings = votes
- Reduces whale influence
- Promotes fair governance

### DAO Council (Future)

**Structure:**
- 7 elected council members
- 6-month terms
- 100,000 X staked minimum to run
- Responsibilities: Propose, moderate, execute

**Elections:**
- Quarterly elections
- X holder voting
- Top 7 vote-getters elected

---

## Roadmap

### Phase 1: Launch (Q4 2024) ✅
- [x] Quest system deployment
- [x] Daily login tracking
- [x] Basic XP and levels
- [x] Onboarding quests
- [x] Referral system

### Phase 2: Gamification (Q1 2025)
- [ ] Badge system live
- [ ] Streak multipliers
- [ ] Achievement quests
- [ ] Leaderboards
- [ ] Mystery boxes

### Phase 3: Staking (Q2 2025)
- [ ] X token staking contract
- [ ] 15% base APY
- [ ] VIP tier benefits
- [ ] Lock period multipliers

### Phase 4: Utility Expansion (Q3 2025)
- [ ] Trading fee discounts
- [ ] Launchpad early access
- [ ] Governance voting
- [ ] Prediction markets beta

### Phase 5: DAO (Q4 2025)
- [ ] Full decentralized governance
- [ ] DAO treasury control
- [ ] Community-driven roadmap
- [ ] Council elections

---

## Conclusion

The X Token rewards system creates a comprehensive incentive structure that rewards active platform participation while building long-term value. By combining quest-based earning, staking rewards, governance participation, and prediction markets, X Token becomes the central pillar of the 10xSwap ecosystem.

**Key Takeaways:**
- ✅ **Fair Distribution**: No pre-mine, 100% community earned
- ✅ **Gamified Experience**: Quests, levels, streaks, badges
- ✅ **Real Utility**: Fee discounts, staking APY, governance
- ✅ **Sustainable Economics**: Balanced inflation/deflation
- ✅ **Community-Driven**: DAO governance from day one

---

## Resources

- **Rewards Dashboard**: `/rewards`
- **Staking Portal**: `/stake` (coming soon)
- **Governance Forum**: TBA
- **X Token Contract**: TBA (testnet)
- **Technical Docs**: [BACKEND_AND_AGENT_SPEC.md](./BACKEND_AND_AGENT_SPEC.md)
- **API Reference**: [Developer Guide](./DEVELOPER_GUIDE.md)

---

**Disclaimer**: Token economics are subject to change based on community governance votes and market conditions. Early parameters may be adjusted to ensure platform sustainability.
