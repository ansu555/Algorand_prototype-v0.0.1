import { BridgeCard } from "@/components/features/bridge/BridgeCard"

export default function BridgePage() {
    return (
        <div className="container mx-auto py-12 px-4 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center relative overflow-hidden">


            <div className="text-center mb-12 space-y-4 relative z-10">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Cross-Chain Bridge
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Seamlessly transfer your assets between Algorand and other major networks with low fees and high security.
                </p>
            </div>

            <div className="w-full relative z-10">
                <BridgeCard />
            </div>
        </div>
    )
}
