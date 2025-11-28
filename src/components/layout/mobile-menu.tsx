"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/shared/mode-toggle";
import AlgorandWalletConnect from "@/components/features/algorand/algorand-wallet-connect";
import { cn } from "@/lib/utils";

export const MobileMenu = () => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close mobile menu when route changes
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Close mobile menu when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                // Check if the click was on the toggle button (which is outside the menu ref)
                // This is a bit tricky since the button is in the parent. 
                // For now, we'll rely on the parent or just let the user close it via the X button inside if we move the button inside.
                // Actually, the design has the button in the header, and the menu as a separate div.
                // We'll expose the toggle functionality or handle it internally if the button is part of this component?
                // The design provided has <MobileMenu /> as a self-contained thing in the desktop view? 
                // No, in the design: <div className="lg:hidden ..."> <MobileMenu /> </div>
                // And MobileMenu seems to contain the trigger? Let's check the design again.
                // The design import says `import { MobileMenu } from "./mobile-menu";`
                // And usage: `<MobileMenu />` inside a div.
                // Usually MobileMenu includes the trigger button.
            }
        }
        // document.addEventListener('mousedown', handleClickOutside);
        // return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItems = [
        { name: "Home", href: "/" },
        { name: "Trade", href: "/trade" },
        { name: "Stake", href: "/stake" },
        { name: "Launchpad", href: "/launchpad" },
        { name: "Portfolio", href: "/portfolio" },
    ];

    const exploreItems = [
        { name: "Tokens", href: "/cryptocurrencies" },
        { name: "Pool", href: "/pool" },
        { name: "Launchpad", href: "/launchpad" },
        { name: "Transaction", href: "/transactions" },
    ];

    return (
        <div className="flex items-center">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle mobile menu"
                className="lg:hidden"
            >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {isOpen && (
                <div className="absolute top-16 left-0 w-full bg-background/95 backdrop-blur-xl border-b border-border/40 shadow-2xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-5 z-40">
                    <nav className="flex flex-col space-y-2">
                        <Link
                            href="/"
                            className={cn(
                                "text-sm font-medium transition-colors py-2 px-2 rounded-md",
                                pathname === "/"
                                    ? "text-primary dark:text-[#F3C623] bg-primary/10 dark:bg-[#F3C623]/10"
                                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                            )}
                        >
                            Home
                        </Link>

                        {/* Explore Section */}
                        <div className="space-y-1">
                            <div className="text-sm font-medium py-2 px-2 text-foreground/80">
                                Explore
                            </div>
                            <div className="ml-4 space-y-1">
                                {exploreItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "block text-sm transition-colors py-2 px-2 rounded-md",
                                            pathname === item.href
                                                ? "text-primary dark:text-[#F3C623] bg-primary/10 dark:bg-[#F3C623]/10 font-semibold"
                                                : "text-foreground/60 hover:text-primary hover:bg-primary/5"
                                        )}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {navItems.slice(1).map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "text-sm font-medium transition-colors py-2 px-2 rounded-md",
                                    pathname === item.href
                                        ? "text-primary dark:text-[#F3C623] bg-primary/10 dark:bg-[#F3C623]/10"
                                        : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                                )}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex flex-col gap-3 pt-3 border-t border-border/20">
                        <div className="w-full">
                            <AlgorandWalletConnect variant="button" className="w-full" />
                        </div>
                        <div className="flex justify-center">
                            <ModeToggle />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
