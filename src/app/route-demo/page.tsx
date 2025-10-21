import React from 'react'
import SwapInterface from '@/components/swap-interface'

export default function RouteDisplayDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[red-50] to-[#F8FAFF] dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[red-600] dark:text-[#F3C623] mb-2">
            Route Display Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the custom swap route selection interface on Avalanche Fuji
          </p>
        </div>
        
        <SwapInterface />
        
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <p>
              This demo shows route discovery and selection for custom swaps on Avalanche Fuji testnet.
            </p>
            <p>
              Features: Multi-hop routing, price impact calculation, gas estimation, and route ranking.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}