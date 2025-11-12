'use client'

import { AgentWalletCard } from '@/components/features/wallet/agent-wallet-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet } from 'lucide-react'

export default function AgentWalletPage() {
  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Agent Wallet</h1>
        <p className="text-muted-foreground">
          Your personal trading agent wallet for autopilot and MCP features
        </p>
      </div>

      <AgentWalletCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            About Agent Wallets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">What is an Agent Wallet?</h3>
            <p className="text-sm text-muted-foreground">
              An agent wallet is a dedicated Algorand wallet created uniquely for you. 
              It enables automated trading and autopilot features without requiring you 
              to sign every transaction manually.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How Does It Work?</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Automatically created when you connect your main wallet</li>
              <li>Stored securely with encrypted credentials</li>
              <li>Can hold ALGO and any Algorand Standard Assets (ASAs)</li>
              <li>Used for executing autopilot trading rules</li>
              <li>Compatible with MCP (Model Context Protocol) features</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Asset Support</h3>
            <p className="text-sm text-muted-foreground">
              Your agent wallet supports all Algorand assets. To use a new asset:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground mt-2">
              <li>The wallet automatically opts-in when needed</li>
              <li>Each opt-in costs 0.1 ALGO (Algorand minimum balance requirement)</li>
              <li>Supported assets: ALGO, USDC, USDT, ALGF, and any other ASA</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Security</h3>
            <p className="text-sm text-muted-foreground">
              Your agent wallet&apos;s private keys are encrypted and stored securely. 
              Only you can access this wallet through your connected main wallet address. 
              Always keep your main wallet secure as it controls access to the agent wallet.
            </p>
          </div>

          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4">
            <h3 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
              ⚠️ Important Notes
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
              <li>Only deposit funds you&apos;re comfortable using for automated trading</li>
              <li>Keep track of your autopilot rules and their spending limits</li>
              <li>You can withdraw funds anytime by transferring back to your main wallet</li>
              <li>Minimum balance: 0.1 ALGO base + 0.1 ALGO per asset opted-in</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
