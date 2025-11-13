# SwapCard Component - Usage Guide

The `SwapCard` component is a fully reusable swap interface that can be integrated into any page in the application.

## Features

- ✅ Token selection with search
- ✅ Amount input with balance display
- ✅ Multi-DEX routing (Tinyman, Pact)
- ✅ Real-time quotes
- ✅ Slippage settings
- ✅ Multiple modes: Swap, Limit, Buy, Sell
- ✅ Auto-Pilot rule creation
- ✅ Wallet integration

## Import

```typescript
// Simple import
import { SwapCard } from '@/components/features/trading'

// Or from direct path
import { SwapCard } from '@/components/features/trading/swap-card'
```

## Basic Usage

```tsx
import { SwapCard } from '@/components/features/trading'

export default function MyPage() {
  return (
    <div className="container mx-auto p-6">
      <SwapCard />
    </div>
  )
}
```

## Advanced Usage with Callbacks

```tsx
import { SwapCard } from '@/components/features/trading'
import type { AssetInfo } from '@/hooks/use-tradeable-assets'
import { useState } from 'react'

export default function MyPage() {
  const [selectedPair, setSelectedPair] = useState<{
    from: AssetInfo | null
    to: AssetInfo | null
  }>({ from: null, to: null })

  const handlePairChange = (from: AssetInfo | null, to: AssetInfo | null) => {
    setSelectedPair({ from, to })
    console.log('Pair changed:', from?.symbol, '→', to?.symbol)
  }

  const handleSwapSuccess = () => {
    console.log('Swap completed successfully!')
    // Refresh data, show notification, etc.
  }

  return (
    <div className="container mx-auto p-6">
      <SwapCard 
        onPairChange={handlePairChange}
        onSwapSuccess={handleSwapSuccess}
      />
      
      {selectedPair.from && selectedPair.to && (
        <div className="mt-4">
          <p>Selected: {selectedPair.from.symbol} → {selectedPair.to.symbol}</p>
        </div>
      )}
    </div>
  )
}
```

## Props

| Prop | Type | Optional | Description |
|------|------|----------|-------------|
| `onPairChange` | `(from: AssetInfo \| null, to: AssetInfo \| null) => void` | Yes | Callback when token pair changes |
| `onSwapSuccess` | `() => void` | Yes | Callback when swap completes successfully |

## Styling

The component uses Tailwind CSS and respects your theme (light/dark mode). It includes:

- Responsive design (mobile-friendly)
- Card-based layout
- Pink accent colors matching your design system
- Smooth animations and transitions

## Example: Pool Details Page

```tsx
'use client'

import { SwapCard } from '@/components/features/trading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PoolDetailsPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Chart */}
      <div className="lg:col-span-2">
        {/* Your chart here */}
      </div>

      {/* Right Column - Swap Card + Stats */}
      <div className="space-y-6">
        {/* Swap Interface */}
        <SwapCard />
        
        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Your stats here */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

## Example: Embedded in Modal

```tsx
'use client'

import { SwapCard } from '@/components/features/trading'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function MyComponent() {
  const [showSwap, setShowSwap] = useState(false)

  return (
    <>
      <Button onClick={() => setShowSwap(true)}>
        Open Swap
      </Button>

      <Dialog open={showSwap} onOpenChange={setShowSwap}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Swap Tokens</DialogTitle>
          </DialogHeader>
          <SwapCard onSwapSuccess={() => setShowSwap(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
```

## Features Breakdown

### 1. Swap Tab (Default)
- Token pair selection
- Amount input with max button
- Real-time quote from routing API
- Multi-DEX routing display
- Slippage tolerance settings

### 2. Limit Tab
- Set limit orders
- Price targets
- Expiration dates

### 3. Buy Tab
- Quick buy interface
- Preset amounts

### 4. Sell Tab
- Quick sell interface
- Percentage-based selling

### 5. Auto-Pilot Tab
- DCA strategy builder
- Rebalancing rules
- Market rotation strategies

## Dependencies

The component requires:
- ✅ Wallet connection (TxnLab provider)
- ✅ Trading assets hook
- ✅ Toast notifications
- ✅ Router API endpoint (`/api/router/quote`, `/api/router/execute`)

## Notes

- The component automatically connects to the active wallet
- It fetches tradeable assets on mount
- Default asset is ALGO (Asset ID 0)
- Supports both testnet and mainnet
- Handles errors gracefully with toast notifications
