"use client"

import { useState } from "react"
import { Footer } from "@/components/footer"
import BackgroundPaths from "@/components/animated-background"
import CoinOverviewPane from "@/components/coin-overview-pane"
import MiniCryptoTable from "@/components/mini-crypto-table"
import SideAnalytics from "@/components/side-analytics"

export default function CryptocurrenciesPage() {
  const [selectedCoinId, setSelectedCoinId] = useState<string | undefined>(undefined)
  return (
    <div className="flex min-h-screen flex-col">
      <BackgroundPaths />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Cryptocurrencies</h1>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: supply info + coin list */}
          <section className="lg:col-span-5 order-1 lg:order-1 space-y-6">
            <SideAnalytics coinId={selectedCoinId} />
            <MiniCryptoTable
              selectedId={selectedCoinId}
              onSelect={(id) => setSelectedCoinId(id)}
              onFirstCoinLoaded={(id) => setSelectedCoinId((prev) => prev ?? id)}
            />
          </section>

          {/* Right: coin overview (chart & history) */}
          <aside className="lg:col-span-7 order-2 lg:order-2">
            <div className="min-h-[360px]">
              <CoinOverviewPane coinId={selectedCoinId} />
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}
