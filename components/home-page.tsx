"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Lazy load heavier components if they exist
const MiniCryptoTable = dynamic(() => import("@/components/mini-crypto-table"), { ssr: false, loading: () => <div className="text-sm text-muted-foreground">Loading assets...</div> });

export default function HomePage() {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  return (
    <div className="flex flex-col gap-16 pb-24">
      {/* Hero */}
      <section className="relative pt-20 pb-24 px-6 md:px-10 lg:px-16 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-foreground to-foreground/70 dark:from-white dark:to-white/70 bg-clip-text text-transparent">
            10xSwap Intelligence Hub
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Real-time crypto data, automated portfolio logic, and intelligent routing—all in one unified interface.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/agent-dashboard"><Button size="lg" className="">Agent Dashboard</Button></Link>
            <Link href="/cryptocurrencies"><Button size="lg" variant="outline">Explore Assets</Button></Link>
          </div>
        </div>
      </section>

      {/* (Market Snapshot removed as requested) */}

      {/* Mini Table */}
      <section className="px-6 md:px-10 lg:px-16">
        <div className="max-w-6xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold tracking-tight">Trending Assets</h2>
            <MiniCryptoTable
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
              onFirstCoinLoaded={(id) => {
                if (!selectedId) setSelectedId(id);
              }}
            />
        </div>
      </section>
    </div>
  );
}
