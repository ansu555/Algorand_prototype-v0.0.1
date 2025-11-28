"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { useEffect, useRef, useState } from "react";
import AlgorandWalletConnect from "@/components/features/algorand/algorand-wallet-connect";
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider";
import { Sparkles, ChevronDown } from "lucide-react";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const pathname = usePathname();
  // const audioRef = useRef<HTMLAudioElement | null>(null);
  // const lastPlayRef = useRef<number>(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { activeAccount } = useWalletConnection();
  const [xTokenBalance, setXTokenBalance] = useState<number>(0);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [hasClaimableQuests, setHasClaimableQuests] = useState(false);

  // Fetch X token balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeAccount?.address) {
        setXTokenBalance(0);
        return;
      }

      try {
        const res = await fetch(`/api/rewards?userId=${activeAccount.address}`);
        const data = await res.json();
        if (data.success) {
          setXTokenBalance(data.data.xTokenBalance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch X token balance:', error);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [activeAccount]);

  // Check for claimable quests
  useEffect(() => {
    const checkClaimable = async () => {
      if (!activeAccount?.address) {
        setHasClaimableQuests(false);
        return;
      }

      try {
        const res = await fetch(`/api/rewards/quests?userId=${activeAccount.address}`);
        const data = await res.json();
        if (data.success) {
          const hasCompleted = data.data.some((q: any) => q.status === 'completed');
          setHasClaimableQuests(hasCompleted);
        }
      } catch (error) {
        console.error('Failed to check claimable quests:', error);
      }
    };

    checkClaimable();
    const interval = setInterval(checkClaimable, 30000);
    return () => clearInterval(interval);
  }, [activeAccount]);

  // Scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 50);
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  /* Audio logic commented out
  useEffect(() => {
    const audio = new Audio("/ui-click-menu-modern-interface-select-small-02-230475.mp3");
    audio.preload = "auto";
    audio.volume = 0.9;
    audioRef.current = audio;
    // ... unlock audio logic ...
  }, []);

  const playHoverSound = () => {
    // ... play sound logic ...
  };
  */
  const playHoverSound = () => { }; // No-op

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Trade", href: "/trade" },
    { name: "Stake", href: "/stake" },
    { name: "Launchpad", href: "/launchpad" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "Rewards", href: "/rewards" },
  ];

  const exploreItems = [
    { name: "Tokens", href: "/cryptocurrencies" },
    { name: "Pool", href: "/pool" },
    { name: "Transaction", href: "/transactions" },
  ];

  return (
    <header
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 sm:gap-4 lg:gap-6 px-3 sm:px-4 lg:px-6 py-3 rounded-2xl border transition-all duration-300 w-auto max-w-[95vw]",
          isScrolled
            ? "bg-background/90 backdrop-blur-xl border-border/40 shadow-2xl"
            : "bg-background/95 backdrop-blur-lg border-border/30 shadow-lg"
        )}
      >
        {/* Logo */}
        <Link
          href="/"
          className="transform transition-transform duration-200 hover:scale-105 flex-shrink-0"
        >
          <Logo />
        </Link>

        {/* Spacer */}
        <div className="hidden lg:block w-px h-6 bg-border/30 flex-shrink-0 mx-2" />

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-3 xl:gap-4 flex-shrink-0">
          {/* Explore Dropdown */}
          <DropdownMenu open={exploreDropdownOpen} onOpenChange={setExploreDropdownOpen}>
            <DropdownMenuTrigger
              className={cn(
                "relative text-foreground/80 hover:text-foreground transition-all duration-300 group px-3 py-1 rounded-lg hover:bg-foreground/5 transform hover:scale-110 font-mono uppercase text-sm whitespace-nowrap flex items-center gap-1",
                exploreItems.some(item => pathname === item.href) && "text-primary dark:text-[#F3C623]"
              )}
              onMouseEnter={() => setExploreDropdownOpen(true)}
              onMouseLeave={() => setExploreDropdownOpen(false)}
              onFocus={playHoverSound}
            >
              Explore
              <ChevronDown className="h-3 w-3" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-4" />
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
                "relative text-foreground/80 hover:text-foreground transition-all duration-300 group px-3 py-1 rounded-lg hover:bg-foreground/5 transform hover:scale-110 hover:rotate-1 hover:skew-x-1 font-mono uppercase text-sm whitespace-nowrap",
                pathname === item.href && "text-primary dark:text-[#F3C623]"
              )}
              onMouseEnter={playHoverSound}
              onFocus={playHoverSound}
            >
              {item.name}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-4" />
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="hidden lg:block w-px h-6 bg-border/30 flex-shrink-0" />

        {/* Auth & X Token */}
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          {activeAccount && (
            <div className="relative">
              <Link href="/rewards">
                <div className="flex items-center gap-1.5 h-9 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 transition-all cursor-pointer shadow-sm hover:shadow-md">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  <span className="font-mono font-semibold text-sm text-amber-900 dark:text-amber-400">{xTokenBalance.toFixed(0)}</span>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-500">X</span>
                </div>
              </Link>
              {hasClaimableQuests && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
          )}

          <AlgorandWalletConnect variant="dropdown" />
          <ModeToggle />
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden flex-shrink-0 ml-auto">
          <MobileMenu />
        </div>
      </div>
      <style jsx>{`
        @keyframes glow {
          0% { box-shadow: 0 0 4px 1px rgba(168,85,247,0.5), 0 0 8px 2px rgba(168,85,247,0.15); }
          100% { box-shadow: 0 0 8px 2px rgba(168,85,247,0.7), 0 0 12px 4px rgba(168,85,247,0.2); }
        }
      `}</style>
    </header>
  );
};
