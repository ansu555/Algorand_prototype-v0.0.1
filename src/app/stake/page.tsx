"use client"

import { SearchBar } from "@/components/shared/search-bar"
import { Sparkles, Rocket, Lock } from "lucide-react"

export default function StakePage() {
  return (
    <div className="min-h-screen p-6">
      <SearchBar />
      
      <div className="max-w-4xl mx-auto mt-20">
        <div className="relative">
          {/* Background gradient blur */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-amber-500/20 to-orange-500/20 blur-3xl opacity-50 animate-pulse"></div>
          
          {/* Main content */}
          <div className="relative bg-white/80 dark:bg-[#171717]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-100/20 dark:border-red-900/20 p-12 md:p-16 text-center">
            {/* Icons */}
            <div className="flex justify-center gap-4 mb-8">
              <div className="relative">
                <Lock className="h-16 w-16 text-red-500 animate-bounce" />
                <Sparkles className="h-6 w-6 text-amber-500 absolute -top-2 -right-2 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <Rocket className="h-16 w-16 text-amber-600 animate-pulse" />
            </div>
            
            {/* Coming Soon Text */}
            <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-red-600 via-amber-600 to-orange-600 dark:from-red-400 dark:via-amber-400 dark:to-orange-400 bg-clip-text text-transparent animate-gradient">
              Coming Soon!
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 font-medium">
              Stake your X tokens and earn passive rewards
            </p>
            
            {/* Features list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
              <div className="bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/30 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
                <div className="text-3xl mb-3">💰</div>
                <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">High APY</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Earn up to 15% annual rewards on staked tokens</p>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-6 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <div className="text-3xl mb-3">🎁</div>
                <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">VIP Benefits</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unlock exclusive features and fee discounts</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-6 rounded-xl border border-orange-100 dark:border-orange-900/30">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Flexible Terms</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Choose your staking period with no lock-up</p>
              </div>
            </div>
            
            {/* Notify button */}
            <div className="mt-12">
              <button className="px-8 py-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                🔔 Notify Me When Available
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  )
}
