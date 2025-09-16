import { AlgorandInfo } from '@/components/algorand-info'
import { WalletConnect } from '@/components/wallet'

export default function AlgorandPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔷 Algorand Integration</h1>
          <p className="text-muted-foreground">
            Experience the power of Pure Proof of Stake with instant finality and minimal fees
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <WalletConnect />
          <AlgorandInfo />
        </div>
        
        <div className="mt-8 p-6 bg-muted/50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Try Algorand Commands</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Basic Commands:</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "algorand address"</li>
                <li>• "algo balance"</li>
                <li>• "algorand portfolio"</li>
                <li>• "algo price"</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Advanced Commands:</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "swap 10 ALGO for USDC"</li>
                <li>• "transfer 5 ALGO to ADDRESS"</li>
                <li>• "algorand transactions"</li>
                <li>• "usdc balance algorand"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
