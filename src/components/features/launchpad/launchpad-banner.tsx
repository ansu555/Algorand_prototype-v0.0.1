"use client"

import { Rocket, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function LaunchpadBanner() {
    return (
        <div className="relative w-full overflow-hidden rounded-2xl border border-border/40 shadow-2xl">
            {/* Background Image */}
            <div className="absolute inset-0">
                <img
                    src="/images/launchpad-banner-bg.jpg
                    "
                    alt="Launchpad Banner"
                    className="w-full h-full object-cover"
                />
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 gap-8">
                {/* Text Content */}
                <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3C623]/10 border border-[#F3C623]/20 text-[#F3C623] text-xs font-medium uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        <span>Premier Launchpad</span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
                        Launch Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3C623] to-amber-500">Next Gem</span>
                    </h1>

                    <p className="text-muted-foreground text-lg max-w-xl">
                        The fairest and most secure way to launch and trade tokens on Algorand.
                        No presales, no team allocations, just pure fair launch.
                    </p>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                        <Link href="/launchpad/create">
                            <Button size="lg" className="bg-[#F3C623] text-black hover:bg-[#F3C623]/90 font-bold px-8">
                                Start Launching
                                <Rocket className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                        <Button variant="outline" size="lg" className="border-border/40 hover:bg-accent">
                            How it works
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
