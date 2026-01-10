"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import CardSwap, { Card } from "@/components/ui/card-swap";
import GradualBlur from "@/components/ui/gradual-blur";

// Lazy load heavier components if they exist
const MiniCryptoTable = dynamic(() => import("@/components/features/crypto/mini-crypto-table"), { ssr: false, loading: () => <div className="text-sm text-muted-foreground">Loading assets...</div> });

export default function HomePage() {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  return (
    <div className="flex flex-col min-h-screen text-white selection:bg-primary/30">
      {/* Hero Section */}
      <section className="relative h-[800px] w-full overflow-hidden flex flex-col justify-center px-6 md:px-10 lg:px-16">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto w-full z-10">
          {/* Left Content */}
          <div className="space-y-8">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
              <span className="text-white">Card stacks have never</span>
              <br />
              <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600">
                looked so good
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
              Just look at it go! Real-time crypto data, automated portfolio logic, and intelligent routing—all in one unified interface.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/portfolio">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-black font-bold px-8 py-6 text-lg rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                  Agent Dashboard
                </Button>
              </Link>
              <Link href="/cryptocurrencies">
                <Button size="lg" variant="outline" className="border-gray-700 text-white hover:bg-gray-900 hover:text-primary px-8 py-6 text-lg rounded-full transition-all duration-300">
                  Explore Assets
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Content - CardSwap */}
          <div className="relative h-[600px] w-full flex items-center justify-center lg:justify-end">
            <CardSwap
              cardDistance={60}
              verticalDistance={70}
              delay={4000}
              pauseOnHover={false}
              width="100%"
              height="100%"
            >
              <Card customClass="border-primary/20 shadow-2xl overflow-hidden w-[380px] md:w-[560px] aspect-[16/9]">
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screenshot-pool-liquidity.png" alt="Pool Liquidity" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </Card>

              <Card customClass="border-primary/20 shadow-2xl overflow-hidden w-[380px] md:w-[560px] aspect-[16/9]">
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screenshot-cryptocurrencies.png" alt="Cryptocurrencies" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </Card>

              <Card customClass="border-primary/20 shadow-2xl overflow-hidden w-[380px] md:w-[560px] aspect-[16/9]">
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screenshot-transaction-history.png" alt="Transaction History" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </Card>

              <Card customClass="border-primary/20 shadow-2xl overflow-hidden w-[380px] md:w-[560px] aspect-[16/9]">
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screenshot-agent-portfolio.png" alt="Portfolio" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </Card>

              <Card customClass="border-primary/20 shadow-2xl overflow-hidden w-[380px] md:w-[560px] aspect-[16/9]">
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screenshot-liquidity-pools.png" alt="Liquidity Pools" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </Card>
            </CardSwap>
          </div>
        </div>

        {/* Gradual Blur Effect at Bottom */}
        <GradualBlur
          target="parent"
          position="bottom"
          height="150px"
          strength={1}
          divCount={8}
          curve="ease-out"
          exponential={true}
          opacity={1}
          zIndex={5}
        />
      </section>

      {/* Mini Table Section */}
      <section className="relative px-6 md:px-10 lg:px-16 py-24">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Trending Assets</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Discover the top performing assets in the ecosystem right now.</p>
          </div>

          <div className="bg-gray-900/50 rounded-3xl border border-gray-800 p-6 md:p-8 backdrop-blur-sm">
            <MiniCryptoTable
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
              onFirstCoinLoaded={(id) => {
                if (!selectedId) setSelectedId(id);
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
