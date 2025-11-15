"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import RuleBuilderModal from "@/components/features/rules/rule-builder-modal";
import { toast } from "@/hooks/use-toast";
import { ModeToggle } from "@/components/shared/mode-toggle";
import AlgorandWalletConnect from "@/components/features/algorand/algorand-wallet-connect";
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronDown } from "lucide-react";
import { useViewport } from "@/hooks/use-viewport";
import { describeRule } from "@/lib/shared/rules";
import { createRule } from "@/features/agent/api/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const { isMobile } = useViewport();
  const { activeAccount } = useWalletConnection();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const modeToggleRef = useRef<HTMLDivElement>(null);
  // Use Algorand wallet address or fallback to placeholder
  const address = activeAccount?.address || "0x0000000000000000000000000000000000000000";

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu when clicking outside or pressing escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Element;
      
      // Don't close if clicking inside mobile menu
      if (mobileMenuRef.current?.contains(target)) {
        return;
      }
      
      // Don't close if clicking on mode toggle or its dropdown
      if (modeToggleRef.current?.contains(target)) {
        return;
      }
      
      // Don't close if clicking on any dropdown menu content (Radix UI portals)
      if (target.closest('[role="menu"]') || 
          target.closest('[data-radix-dropdown-menu-content]') ||
          target.closest('[data-radix-popper-content-wrapper]')) {
        return;
      }
      
      setMobileMenuOpen(false);
    }

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Trade", href: "/trade" },
    { name: "Stake", href: "/stake" },
    { name: "Portfolio", href: "/portfolio" },
  ];

  const exploreItems = [
    { name: "Tokens", href: "/cryptocurrencies" },
    { name: "Pool", href: "/pool" },
    { name: "Transaction", href: "/transactions" },
  ];

  const saveRule = async (rule: any) => {
    // Map UI schema -> API schema
    const type = rule.strategy === 'DCA' ? 'dca' : rule.strategy === 'REBALANCE' ? 'rebalance' : 'rotate'
    const payload = {
      ownerAddress: address || "0x0000000000000000000000000000000000000000",
      type,
      targets: Array.isArray(rule.coins) ? rule.coins : [],
      rotateTopN: rule.rotateTopN,
      maxSpendUSD: rule.maxSpendUsd,
      maxSlippage: rule.maxSlippagePercent,
      cooldownMinutes: rule.cooldownMinutes,
      // Trigger fields are mapped on the server via mapTrigger
      triggerType: rule.triggerType,
      dropPercent: rule.dropPercent,
      trendWindow: rule.trendWindow,
      trendThreshold: rule.trendThreshold,
      momentumLookback: rule.momentumLookback,
      momentumThreshold: rule.momentumThreshold,
      status: 'active',
    }

    setRules((prev) => [payload as any, ...prev])
    try {
      const json = await createRule(payload)
      setRules((prev) => [{ ...(payload as any), id: json.id }, ...prev.filter((r) => (r as any) !== (payload as any))])
    } catch (e) {
      console.error("Failed to save rule:", e)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur dark:bg-[#171717]/95 shadow">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
       <Link href="/" className="flex items-center font-extrabold text-lg md:text-xl tracking-tight">
        <img 
          src="/10xswap_logo.png" 
          alt="10xSwap Logo" 
          className="h-8 w-8 mr-2"
        />
        <span className="text-primary dark:text-[#F3C623]">10x</span>
        <span className="dark:text-white">Swap</span>
      </Link>

        {/* Desktop navigation - Centered */}
  <nav className="hidden md:flex gap-6 lg:gap-8 absolute left-1/2 -translate-x-1/2 transform items-center">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors",
              pathname === "/"
                ? "text-primary dark:text-[#F3C623] underline"
                : "text-gray-700 hover:text-primary dark:text-[#F3C623]/60 dark:hover:text-[#F3C623]"
            )}
          >
            Home
          </Link>
          
          {/* Explore Dropdown */}
          <DropdownMenu open={exploreDropdownOpen} onOpenChange={setExploreDropdownOpen}>
            <DropdownMenuTrigger 
              className={cn(
                "text-sm font-medium transition-colors flex items-center gap-1",
                exploreItems.some(item => pathname === item.href)
                  ? "text-primary dark:text-[#F3C623] underline"
                  : "text-gray-700 hover:text-primary dark:text-[#F3C623]/60 dark:hover:text-[#F3C623]"
              )}
              onMouseEnter={() => setExploreDropdownOpen(true)}
              onMouseLeave={() => setExploreDropdownOpen(false)}
            >
              Explore
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="center" 
              className="w-40"
              onMouseEnter={() => setExploreDropdownOpen(true)}
              onMouseLeave={() => setExploreDropdownOpen(false)}
            >
              {exploreItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "w-full cursor-pointer",
                      pathname === item.href && "text-primary dark:text-[#F3C623] font-semibold"
                    )}
                  >
                    {item.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {navItems.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === item.href
                  ? "text-primary dark:text-[#F3C623] underline"
                  : "text-gray-700 hover:text-primary dark:text-[#F3C623]/60 dark:hover:text-[#F3C623]"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop wallet connect and mode toggle */}
        <div className="hidden md:flex items-center gap-2">
          <AlgorandWalletConnect variant="dropdown" />
          <ModeToggle />
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="mobile-menu md:hidden border-t bg-white/95 backdrop-blur dark:bg-[#171717]/95 absolute w-full z-40">
          <div className="container py-4 space-y-4">
            <nav className="flex flex-col space-y-3">
              <Link
                href="/"
                className={cn(
                  "text-sm font-medium transition-colors py-2 px-2 rounded-md",
                  pathname === "/"
                    ? "text-primary dark:text-[#F3C623] bg-primary/10 dark:bg-[#F3C623]/10"
                    : "text-gray-700 hover:text-primary hover:bg-primary/5 dark:text-[#F3C623]/60 dark:hover:text-[#F3C623] dark:hover:bg-[#F3C623]/5"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              
              {/* Explore Dropdown for Mobile */}
              <div className="space-y-1">
                <div className={cn(
                  "text-sm font-medium py-2 px-2",
                  exploreItems.some(item => pathname === item.href)
                    ? "text-primary dark:text-[#F3C623]"
                    : "text-gray-700 dark:text-[#F3C623]/60"
                )}>
                  Explore
                </div>
                <div className="ml-4 space-y-2">
                  {exploreItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block text-sm transition-colors py-2 px-2 rounded-md",
                        pathname === item.href
                          ? "text-primary dark:text-[#F3C623] bg-primary/10 dark:bg-[#F3C623]/10 font-semibold"
                          : "text-gray-600 hover:text-primary hover:bg-primary/5 dark:text-[#F3C623]/50 dark:hover:text-[#F3C623] dark:hover:bg-[#F3C623]/5"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
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
                      : "text-gray-700 hover:text-primary hover:bg-primary/5 dark:text-[#F3C623]/60 dark:hover:text-[#F3C623] dark:hover:bg-[#F3C623]/5"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-3 pt-3 border-t">
              <div className="w-full">
                <AlgorandWalletConnect variant="button" className="w-full" />
              </div>
              <div className="flex justify-center">
                <div ref={modeToggleRef} data-theme-toggle>
                  <ModeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
