"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Rocket } from "lucide-react"
import Link from "next/link"

export function PremierLaunchCard() {
    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="bg-[#F3C623]/10 text-[#F3C623] border-[#F3C623]/20 text-[10px] px-2 py-0.5 rounded-sm font-bold tracking-wider">
                    PREMIER
                </Badge>
            </div>

            <h2 className="text-2xl font-bold mb-2">Premier Launches</h2>

            <Card className="w-full bg-[#111111] border-border/40 overflow-hidden relative group">
                <CardContent className="p-0 min-h-[200px] flex flex-col md:flex-row">
                    {/* Left Content */}
                    <div className="p-6 md:p-8 flex-1 flex flex-col justify-center relative z-10">
                        <p className="text-muted-foreground mb-6 max-w-md">
                            We partner with large, engaged communities to launch meaningful crypto projects.
                        </p>

                        <div className="flex flex-col items-start gap-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <span>No Active Premier Launches</span>
                            </div>
                            <p className="text-xs text-muted-foreground/60">More launches coming soon</p>

                            <Link href="/launchpad/create" className="mt-2">
                                <Button variant="link" className="p-0 text-[#F3C623] hover:text-[#F3C623]/80 h-auto font-semibold flex items-center gap-1">
                                    Apply Now <ChevronRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Right/Background Visual */}
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent z-0 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('/grid-pattern.svg')] opacity-5" />
                </CardContent>
            </Card>
        </div>
    )
}
