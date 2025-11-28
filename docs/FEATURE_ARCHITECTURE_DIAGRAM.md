# 10xSwap Feature Architecture Diagram

**Complete diagram showing how all DEX features communicate and work together.**

**Last Updated:** 2025-11-28

---

## Table of Contents

1. [High-Level System Overview](#high-level-system-overview)
2. [Feature Interconnection Diagram](#feature-interconnection-diagram)
3. [Detailed Feature Communication Flows](#detailed-feature-communication-flows)
4. [Smart Contract Integration](#smart-contract-integration)
5. [Feature Dependencies](#feature-dependencies)
6. [Data Flow Summary](#data-flow-summary)

---

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            10xSwap PLATFORM OVERVIEW                             │
│                                                                                  │
│    ┌────────────────────────────────────────────────────────────────────────┐  │
│    │                         FRONTEND (Next.js 15)                           │  │
│    │                                                                         │  │
│    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│    │   │   Swap UI   │  │  Launchpad  │  │   Rewards   │  │  Autopilot  │  │  │
│    │   │   /swap     │  │  /launchpad │  │   /rewards  │  │   /agent    │  │  │
│    │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │  │
│    │          │                │                │                │          │  │
│    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│    │   │  Pool UI    │  │  Wallet UI  │  │  AI Chat    │  │ Analytics   │  │  │
│    │   │   /pool     │  │  /wallet    │  │   /agent    │  │ /analytics  │  │  │
│    │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │  │
│    └──────────┼───────────────┼───────────────┼───────────────┼───────────┘  │
│               │               │               │               │              │
│               ▼               ▼               ▼               ▼              │
│    ┌────────────────────────────────────────────────────────────────────────┐  │
│    │                          API LAYER (Next.js API Routes)                 │  │
│    │                                                                         │  │
│    │   /api/trade    /api/launchpad    /api/rewards    /api/agent           │  │
│    │   /api/pools    /api/algorand     /api/rules      /api/poller          │  │
│    │   /api/price    /api/analytics    /api/db         /api/logs            │  │
│    └────────────────────────────────────────────────────────────────────────┘  │
│               │               │               │               │              │
│               ▼               ▼               ▼               ▼              │
│    ┌────────────────────────────────────────────────────────────────────────┐  │
│    │                         BLOCKCHAIN (Algorand)                           │  │
│    │                                                                         │  │
│    │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│    │   │  Smart Contracts │  │   DEX Pools     │  │  Token Assets   │       │  │
│    │   │  (6 contracts)   │  │ (Tinyman, Pact) │  │  (ASAs)         │       │  │
│    │   └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│    └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Interconnection Diagram

This diagram shows how all major features communicate and depend on each other:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FEATURE INTERCONNECTION MAP                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────────────┐
                                    │     🤖 AI AGENT      │
                                    │  Natural Language    │
                                    │     Interface        │
                                    └──────────┬───────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
    ┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
    │   💱 MULTI-DEX        │    │   🔄 AUTOPILOT        │    │   📊 ANALYTICS        │
    │   AGGREGATION         │◄───│   Automated Trading   │───►│   Market Data         │
    │   (Tinyman + Pact)    │    │   (DCA/Rebalance)     │    │   Price Oracle        │
    └───────────┬───────────┘    └───────────┬───────────┘    └───────────┬───────────┘
                │                            │                            │
    ┌───────────┼────────────────────────────┼────────────────────────────┼───────────┐
    │           │                            │                            │           │
    │           ▼                            ▼                            ▼           │
    │   ┌───────────────┐            ┌───────────────┐            ┌───────────────┐   │
    │   │ 🏊 LIQUIDITY  │            │ 👛 AGENT      │            │ 💰 PRICE      │   │
    │   │    POOLS      │◄──────────►│   WALLETS     │◄──────────►│   ORACLE      │   │
    │   │   (100+ pools)│            │   (Per-user)  │            │   (Multi-src) │   │
    │   └───────────────┘            └───────────────┘            └───────────────┘   │
    │           │                            │                            │           │
    └───────────┼────────────────────────────┼────────────────────────────┼───────────┘
                │                            │                            │
                ▼                            ▼                            ▼
    ┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
    │   🚀 TOKEN            │    │   🎮 REWARDS          │    │   📜 SMART            │
    │   LAUNCHPAD           │───►│   SYSTEM              │◄───│   CONTRACTS           │
    │   (Bonding Curves)    │    │   (Quests/Badges)     │    │   (6 Contracts)       │
    └───────────┬───────────┘    └───────────┬───────────┘    └───────────┬───────────┘
                │                            │                            │
                └────────────────────────────┼────────────────────────────┘
                                             │
                                             ▼
                                ┌─────────────────────────┐
                                │   ⛓️ ALGORAND BLOCKCHAIN │
                                │                         │
                                │  • Testnet / Mainnet    │
                                │  • Sub-3s Finality      │
                                │  • Low Fees (~0.001)    │
                                └─────────────────────────┘
```

---

## Detailed Feature Communication Flows

### 1. AI Agent ↔ All Features

The AI Agent serves as the central command interface, connecting to all major features:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AI AGENT COMMUNICATION HUB                               │
└─────────────────────────────────────────────────────────────────────────────────┘

                              USER INPUT
                           "swap 10 ALGO for USDC"
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │        🤖 AI AGENT           │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │  Natural Language      │  │
                    │  │  Parser (Regex + LLM)  │  │
                    │  └───────────┬────────────┘  │
                    │              │               │
                    │  ┌───────────▼────────────┐  │
                    │  │  Intent Recognition    │  │
                    │  │  • Balance? → Query    │  │
                    │  │  • Swap? → Trade       │  │
                    │  │  • Transfer? → Send    │  │
                    │  │  • Rules? → Autopilot  │  │
                    │  └───────────┬────────────┘  │
                    └──────────────┼───────────────┘
                                   │
        ┌──────────────┬───────────┼───────────┬──────────────┐
        │              │           │           │              │
        ▼              ▼           ▼           ▼              ▼
┌───────────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ Multi-DEX     │ │ Agent     │ │ Autopilot │ │ Price     │ │ Rewards   │
│ Aggregator    │ │ Wallet    │ │ Rules     │ │ Oracle    │ │ System    │
│               │ │           │ │           │ │           │ │           │
│ • Get quotes  │ │ • Balance │ │ • Create  │ │ • Current │ │ • Track   │
│ • Execute     │ │ • Transfer│ │ • Execute │ │ • History │ │   action  │
│   swaps       │ │ • Opt-in  │ │ • Status  │ │ • Charts  │ │ • Award   │
└───────────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
        │              │           │           │              │
        └──────────────┴───────────┼───────────┴──────────────┘
                                   │
                                   ▼
                          AGENT RESPONSE
                     "Swapped 10 ALGO → 1.5 USDC
                      via Tinyman. TxID: ABC..."
```

---

### 2. Multi-DEX Aggregation ↔ Liquidity Pools

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-DEX AGGREGATION FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

                         User: "Swap 2 USDC for ALGO"
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     MULTI-DEX AGGREGATOR     │
                    │     (src/lib/dex/aggregator) │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
        ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
        │   TINYMAN     │ │     PACT      │ │   (Future)    │
        │   CLIENT      │ │    CLIENT     │ │   DEX Client  │
        │               │ │               │ │               │
        │ Quote: 1.234  │ │ Quote: 1.245  │ │    Quote: ?   │
        │ Impact: 0.12% │ │ Impact: 0.11% │ │               │
        │ Fee: 0.30%    │ │ Fee: 0.25%    │ │               │
        └───────┬───────┘ └───────┬───────┘ └───────────────┘
                │                 │
                └────────┬────────┘
                         │
                         ▼
        ┌─────────────────────────────────────────────┐
        │           QUOTE COMPARISON                  │
        │                                             │
        │   1. Filter by price impact (< 5%)   ✅    │
        │   2. Check preferred DEX             ❌    │
        │   3. Select highest output      → PACT ✅  │
        │   4. Liquidity tie-breaker           N/A   │
        └─────────────────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────────────┐
        │         SELECTED: PACT FINANCE              │
        │         Reason: Best output (1.245 ALGO)    │
        │         Price Impact: 0.11%                 │
        └─────────────────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────────────┐
        │           SMART CONTRACTS                   │
        │                                             │
        │  ┌─────────────────────────────────────┐   │
        │  │     MultihopSwapRouter               │   │
        │  │         (App ID: 749360450)          │   │
        │  └──────────────┬──────────────────────┘   │
        │                 │                          │
        │                 ▼                          │
        │  ┌─────────────────────────────────────┐   │
        │  │     PactPoolAdapter                  │   │
        │  │         (App ID: 749341932)          │   │
        │  └──────────────┬──────────────────────┘   │
        │                 │                          │
        │                 ▼                          │
        │  ┌─────────────────────────────────────┐   │
        │  │     Pact Finance Pool               │   │
        │  │         (USDC/ALGO)                  │   │
        │  └─────────────────────────────────────┘   │
        └─────────────────────────────────────────────┘
                         │
                         ▼
                   SWAP EXECUTED
              User receives 1.245 ALGO
```

---

### 3. Token Launchpad ↔ Rewards ↔ DEX

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    TOKEN LAUNCHPAD LIFECYCLE                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

   PHASE 1: PROJECT CREATION          PHASE 2: BONDING CURVE         PHASE 3: GRADUATION
   ─────────────────────────          ────────────────────────       ──────────────────────

   Creator configures:                Users purchase tokens:         Auto-DEX deployment:
   ┌───────────────────┐              ┌───────────────────┐          ┌───────────────────┐
   │ Token Details     │              │ Bonding Curve     │          │ Liquidity Pool    │
   │ • Name, Symbol    │              │ Active            │          │ Created           │
   │ • Supply          │      ───►    │                   │    ───►  │                   │
   │ Curve Type        │              │ Price increases   │          │ 80% ALGO + Tokens │
   │ • Linear          │              │ as sales progress │          │ deposited to DEX  │
   │ • Exponential     │              │                   │          │                   │
   │ • Sigmoid         │              │ Anti-bot checks:  │          │ LP tokens locked  │
   │                   │              │ • Cooldown        │          │ for 6 months      │
   │ Pricing           │              │ • Per-tx limit    │          │                   │
   │ • Base: $0.01     │              │ • Per-user limit  │          │ Creator receives  │
   │ • Max: $0.10      │              │ • Whale penalty   │          │ 20% of raised ALGO│
   │ • Target: 10K ALGO│              │                   │          │                   │
   └─────────┬─────────┘              └─────────┬─────────┘          └─────────┬─────────┘
             │                                  │                              │
             │                                  │                              │
             ▼                                  ▼                              ▼
   ┌───────────────────────────────────────────────────────────────────────────────────┐
   │                              REWARDS SYSTEM INTEGRATION                            │
   │                                                                                    │
   │   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐         │
   │   │ Early Buyer      │     │ Points Earning   │     │ Vesting Claims   │         │
   │   │ Multipliers      │     │                  │     │                  │         │
   │   │                  │     │ 3x → 1x based    │     │ 30-day linear    │         │
   │   │ 0-10%: 3x points │     │ on purchase      │     │ unlock after     │         │
   │   │ 10-25%: 2.5x     │     │ timing           │     │ graduation       │         │
   │   │ 25-50%: 2x       │     │                  │     │                  │         │
   │   │ 50-75%: 1.5x     │     │ Example:         │     │ Daily claim:     │         │
   │   │ 75-100%: 1x      │     │ $100 @ 10% =     │     │ totalPoints / 30 │         │
   │   │                  │     │ 250 points       │     │                  │         │
   │   └──────────────────┘     └──────────────────┘     └──────────────────┘         │
   │                                                                                    │
   │   ┌──────────────────────────────────────────────────────────────────────────┐   │
   │   │                    X TOKEN QUEST REWARDS                                  │   │
   │   │                                                                           │   │
   │   │   Quest: "Participate in Token Launch"  ────────────►  Reward: 100 X     │   │
   │   │   Quest: "Buy $50+ in Launchpad"        ────────────►  Reward: 200 X     │   │
   │   │   Quest: "Hold Tokens 30 Days"          ────────────►  Reward: 500 X     │   │
   │   │                                                         + Diamond Badge  │   │
   │   └──────────────────────────────────────────────────────────────────────────┘   │
   └───────────────────────────────────────────────────────────────────────────────────┘
             │                                  │                              │
             └──────────────────────────────────┼──────────────────────────────┘
                                                │
                                                ▼
                                   ┌─────────────────────────┐
                                   │  MULTI-DEX AGGREGATION  │
                                   │                         │
                                   │  Graduated token now    │
                                   │  tradable via Tinyman   │
                                   │  or Pact DEX pools      │
                                   └─────────────────────────┘
```

---

### 4. Autopilot ↔ Agent Wallet ↔ DEX

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AUTOPILOT EXECUTION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

            ┌───────────────────────────────────────────────────────────┐
            │                    RULE CREATION                          │
            │                                                           │
            │   User creates DCA rule:                                  │
            │   {                                                       │
            │     "type": "dca",                                        │
            │     "targets": ["ALGO"],                                  │
            │     "maxSpendUSD": 50,                                    │
            │     "trigger": {                                          │
            │       "type": "price_drop_pct",                           │
            │       "value": 5                                          │
            │     },                                                    │
            │     "cooldownMinutes": 1440                               │
            │   }                                                       │
            └───────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              POLLER SERVICE                                           │
│                          (Runs daily at midnight UTC)                                 │
│                                                                                       │
│   ┌────────────────┐    ┌────────────────┐    ┌────────────────┐    ┌──────────────┐│
│   │ 1. Fetch       │    │ 2. Get         │    │ 3. Evaluate    │    │ 4. Execute   ││
│   │    Active      │ ─► │    Current     │ ─► │    Trigger     │ ─► │    if Met    ││
│   │    Rules       │    │    Prices      │    │    Conditions  │    │              ││
│   └────────────────┘    └────────────────┘    └────────────────┘    └──────────────┘│
│                                                                                       │
└───────────────────────────────────────────────┬──────────────────────────────────────┘
                                                │
                                                ▼
            ┌───────────────────────────────────────────────────────────┐
            │                  AGENT WALLET SYSTEM                      │
            │                                                           │
            │  ┌─────────────────────────────────────────────────────┐ │
            │  │ Per-User Agent Wallet                               │ │
            │  │                                                     │ │
            │  │  Address: 2AXW6UGLRW...E6OHWOMA                     │ │
            │  │  (Encrypted mnemonic stored in DB)                  │ │
            │  │                                                     │ │
            │  │  1. Check balance ≥ required amount                 │ │
            │  │  2. Auto opt-in to assets if needed                 │ │
            │  │  3. Execute transfer/swap                           │ │
            │  └─────────────────────────────────────────────────────┘ │
            └───────────────────────────────────────────────────────────┘
                                                │
                                                ▼
            ┌───────────────────────────────────────────────────────────┐
            │                    EXECUTION OPTIONS                      │
            │                                                           │
            │    ┌─────────────┐         ┌─────────────────────────┐   │
            │    │ Direct      │         │ DEX Swap via            │   │
            │    │ Transfer    │   OR    │ Multi-DEX Aggregator    │   │
            │    │             │         │                         │   │
            │    │ Agent       │         │ Agent Wallet ──►        │   │
            │    │ Wallet ───► │         │ MultihopSwapRouter ───► │   │
            │    │ Main Wallet │         │ Pool Adapter ───►       │   │
            │    │             │         │ DEX Pool ───►           │   │
            │    │             │         │ Main Wallet             │   │
            │    └─────────────┘         └─────────────────────────┘   │
            └───────────────────────────────────────────────────────────┘
                                                │
                                                ▼
            ┌───────────────────────────────────────────────────────────┐
            │                    REWARDS TRACKING                       │
            │                                                           │
            │   Action logged → Quest progress updated → XP awarded     │
            │                                                           │
            │   Quest: "50+ Agent Executions" → 800 X + 🤖 Badge        │
            └───────────────────────────────────────────────────────────┘
```

---

### 5. X Token Rewards ↔ All Features

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        REWARDS SYSTEM INTEGRATION                                │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                           ACTION TRACKING                                    │
   │                    (All user actions feed into rewards)                      │
   └─────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
│   SWAP ACTIONS    │       │  LIQUIDITY ACTIONS│       │ AUTOPILOT ACTIONS │
│                   │       │                   │       │                   │
│ • Execute swap    │       │ • Add liquidity   │       │ • Create rule     │
│   → 10 X + 10 XP  │       │   → 40 X + 50 XP  │       │   → 30 X + 30 XP  │
│                   │       │                   │       │                   │
│ • 5 swaps         │       │ • 90-day LP       │       │ • 50+ executions  │
│   → 50 X          │       │   → 1000 X + 💎   │       │   → 800 X + 🤖    │
│                   │       │                   │       │                   │
│ • 500 swaps       │       │ • $10K+ TVL       │       │ • Complex strategy│
│   → 1500 X + 🏆   │       │   → 2500 X + 🐋   │       │   → 500 X         │
└─────────┬─────────┘       └─────────┬─────────┘       └─────────┬─────────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
│ LAUNCHPAD ACTIONS │       │  SOCIAL ACTIONS   │       │  DAILY ACTIONS    │
│                   │       │                   │       │                   │
│ • Buy in launch   │       │ • Refer friend    │       │ • Daily login     │
│   → Points (3x-1x)│       │   → 50 X + 10%    │       │   → 5 X × streak  │
│                   │       │     of friend's   │       │                   │
│ • Hold 30 days    │       │     rewards       │       │ • 30-day streak   │
│   → 500 X + 💎    │       │                   │       │   → 3x multiplier │
│                   │       │ • 10 referrals    │       │                   │
│ • First launch    │       │   → 500 X + 🦋    │       │ • Daily swap      │
│   → 100 X         │       │                   │       │   → 10 X          │
└─────────┬─────────┘       └─────────┬─────────┘       └─────────┬─────────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      │
                                      ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                        X TOKEN REWARDS ENGINE                                │
   │                                                                              │
   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
   │   │ Quest       │    │ Level       │    │ Streak      │    │ Badge       │ │
   │   │ Tracker     │───►│ Calculator  │───►│ Multiplier  │───►│ Unlocks     │ │
   │   │             │    │ (1-30)      │    │ (1x-3x)     │    │             │ │
   │   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
   │                                                                              │
   │   ┌──────────────────────────────────────────────────────────────────────┐ │
   │   │ Final Reward = Base Reward × Streak Multiplier × Badge Bonus         │ │
   │   │                                                                       │ │
   │   │ Example: 10 X × 2.0 (14-day streak) × 1.1 (Early Adopter) = 22 X     │ │
   │   └──────────────────────────────────────────────────────────────────────┘ │
   └─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                      FUTURE UTILITY (Coming Soon)                            │
   │                                                                              │
   │   • Trading Fee Discounts (up to 75% off)                                   │
   │   • Staking Rewards (15-40% APY)                                            │
   │   • Governance Voting (1 X = 1 vote)                                        │
   │   • Prediction Markets                                                       │
   │   • VIP Tier Benefits                                                        │
   └─────────────────────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      SMART CONTRACT ARCHITECTURE                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────────────────┐
                         │        USER APPLICATION         │
                         │       (Frontend + API)          │
                         └────────────────┬────────────────┘
                                          │
                 ┌────────────────────────┼────────────────────────┐
                 │                        │                        │
                 ▼                        ▼                        ▼
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│   MultihopSwapRouter   │  │  AutoPilotRuleContract │  │    TokenLaunchpad      │
│    (749360450)         │  │    (749509231)         │  │    (750324113)         │
│                        │  │                        │  │                        │
│  • execute_swap_1hop   │  │  • create_rule         │  │  • create_launch       │
│  • execute_swap_2hop   │  │  • execute_rule        │  │  • buy_tokens          │
│                        │  │  • delete_rule         │  │  • graduate            │
│                        │  │                        │  │  • claim_tokens        │
└──────────┬─────────────┘  └────────────────────────┘  └────────────────────────┘
           │
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────────────────────┐  ┌────────────────────────┐
│  TinymanPoolAdapter    │  │   PactPoolAdapter      │
│    (749360541)         │  │    (749341932)         │
│                        │  │                        │
│  • swap_fixed_input    │  │  • swap_fixed_input    │
│  • ABI: 0xd71d146d     │  │  • swap_algo_to_asa    │
│  • Fee: 0.30%          │  │  • swap_asa_to_algo    │
│                        │  │  • ABI: 0xf4b4e0f4     │
│                        │  │  • Fee: 0.25%          │
└──────────┬─────────────┘  └──────────┬─────────────┘
           │                           │
           ▼                           ▼
┌────────────────────────┐  ┌────────────────────────┐
│   Tinyman V2 Pools     │  │   Pact Finance Pools   │
│                        │  │                        │
│  • 100+ pools          │  │  • 50+ pools           │
│  • Testnet + Mainnet   │  │  • Mainnet focus       │
│  • Constant Product    │  │  • Constant Product    │
│    AMM (x*y=k)         │  │    AMM (x*y=k)         │
└────────────────────────┘  └────────────────────────┘
           │                           │
           └───────────────┬───────────┘
                           │
                           ▼
             ┌────────────────────────────────┐
             │  LiquidityPoolContract         │
             │  (Deploy per pool)             │
             │                                │
             │  • create_pool                 │
             │  • add_liquidity               │
             │  • remove_liquidity            │
             │  • swap                        │
             │  • Configurable fees (5-1000bp)│
             └────────────────────────────────┘
```

---

## Feature Dependencies

This diagram shows the dependency relationships between features:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FEATURE DEPENDENCY GRAPH                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                    CORE DEPENDENCIES (Must work first)
                    ═══════════════════════════════════

        ┌─────────────────────────────────────────────────────────────┐
        │                    ALGORAND BLOCKCHAIN                       │
        │              (Foundation for all features)                   │
        └─────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌───────────────────┐ ┌───────────────┐ ┌───────────────────┐
        │   Wallet System   │ │  Price Oracle │ │  Smart Contracts  │
        │                   │ │               │ │                   │
        │ • Connect wallet  │ │ • CoinGecko   │ │ • Router          │
        │ • Sign txns       │ │ • CoinRanking │ │ • Adapters        │
        │ • Multi-provider  │ │ • DEX prices  │ │ • Autopilot       │
        └───────────────────┘ └───────────────┘ └───────────────────┘
                │                   │                   │
                └───────────────────┼───────────────────┘
                                    │
                    ════════════════════════════════════
                    FEATURE LAYER (Depends on core)
                    ════════════════════════════════════
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   Multi-DEX       │   │   Liquidity       │   │   Agent Wallet    │
│   Aggregation     │   │   Pools           │   │   System          │
│                   │   │                   │   │                   │
│ Depends on:       │   │ Depends on:       │   │ Depends on:       │
│ • Price Oracle    │   │ • Smart Contracts │   │ • Wallet System   │
│ • Smart Contracts │   │ • Wallet System   │   │ • Encryption      │
│ • DEX APIs        │   │ • DEX APIs        │   │ • Database        │
└─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   AI Agent        │   │   Autopilot       │   │   Token Launchpad │
│                   │   │                   │   │                   │
│ Depends on:       │   │ Depends on:       │   │ Depends on:       │
│ • Multi-DEX Agg   │   │ • Agent Wallet    │   │ • Smart Contracts │
│ • Agent Wallet    │   │ • Multi-DEX Agg   │   │ • Liquidity Pools │
│ • Price Oracle    │   │ • Price Oracle    │   │ • Price Oracle    │
│ • NLP (LangChain) │   │ • Poller Service  │   │ • Database        │
└─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────────┐
                    │       X TOKEN REWARDS         │
                    │                               │
                    │ Depends on:                   │
                    │ • All feature actions         │
                    │   (swaps, LP, autopilot,      │
                    │    launchpad participation)   │
                    │ • Database                    │
                    │ • User authentication         │
                    └───────────────────────────────┘


                    ════════════════════════════════════
                    FUTURE FEATURES (Coming Soon)
                    ════════════════════════════════════

        ┌───────────────────────┐   ┌───────────────────────┐
        │   Staking System      │   │   Prediction Markets  │
        │                       │   │                       │
        │ Depends on:           │   │ Depends on:           │
        │ • X Token             │   │ • X Token             │
        │ • Smart Contracts     │   │ • Oracle System       │
        │ • Rewards System      │   │ • Smart Contracts     │
        └───────────────────────┘   └───────────────────────┘
                    │                           │
                    └───────────┬───────────────┘
                                │
                                ▼
                    ┌───────────────────────────────┐
                    │       DAO GOVERNANCE          │
                    │                               │
                    │ Depends on:                   │
                    │ • X Token Staking             │
                    │ • Voting Contracts            │
                    │ • Treasury Management         │
                    └───────────────────────────────┘
```

---

## Data Flow Summary

| Source Feature | Target Feature | Data Exchanged | Purpose |
|----------------|----------------|----------------|---------|
| **AI Agent** | Multi-DEX Agg | Swap commands | Execute natural language trades |
| **AI Agent** | Autopilot | Rule creation | Set up automated strategies |
| **AI Agent** | Price Oracle | Price queries | Get market data |
| **Multi-DEX Agg** | Liquidity Pools | Pool quotes | Find best swap rates |
| **Multi-DEX Agg** | Smart Contracts | Swap execution | On-chain swaps |
| **Autopilot** | Agent Wallet | Balance/transfers | Execute automated trades |
| **Autopilot** | Price Oracle | Price data | Evaluate trigger conditions |
| **Autopilot** | Multi-DEX Agg | Swap execution | Execute DCA/rebalance |
| **Token Launchpad** | Smart Contracts | Token creation | Deploy ASAs |
| **Token Launchpad** | Liquidity Pools | Pool creation | Graduate to DEX |
| **Token Launchpad** | Rewards System | Points awards | Early buyer rewards |
| **All Features** | Rewards System | Action events | Track quests/XP |
| **Rewards System** | Database | State storage | Persist user progress |

---

## Related Documentation

- **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** - High-level architecture
- **[AUTOPILOT_MODULE.md](./AUTOPILOT_MODULE.md)** - Autopilot details
- **[TOKEN_LAUNCHPAD.md](./TOKEN_LAUNCHPAD.md)** - Launchpad guide
- **[TOKEN_ECONOMICS.md](./TOKEN_ECONOMICS.md)** - X Token rewards
- **[AI_AGENT_AND_MCP_NCP_SPEC.md](./AI_AGENT_AND_MCP_NCP_SPEC.md)** - AI agent specs
- **[LIQUIDITY_POOLS.md](./LIQUIDITY_POOLS.md)** - Pool integration
- **[CONTRACTS_AND_DEPLOYMENT.md](./CONTRACTS_AND_DEPLOYMENT.md)** - Smart contracts

---

**Last Updated:** 2025-11-28
**Version:** 1.0.0
**Status:** ✅ Complete
