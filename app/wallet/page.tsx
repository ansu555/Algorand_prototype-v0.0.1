'use client'

import { AlgorandWalletConnect } from '@/components/algorand-wallet-connect'
import { WalletInfo } from '@/components/wallet-info'

export default function WalletPage() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Algorand Wallet Connection
        </h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
            <AlgorandWalletConnect />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Wallet Status</h2>
            <WalletInfo />
          </div>
        </div>
      </div>
    </div>
  )
}
