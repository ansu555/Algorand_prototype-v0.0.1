import Link from "next/link"
import { Github, Twitter, Linkedin, Mail } from "lucide-react"
import GuidelinesBubble from "@/components/guidelines-bubble"

export function Footer() {
  return (
    <footer className="sticky bottom-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-[#171717]/95 shadow-[0_-4px_20px_-4px_rgba(17,60,252,0.25)] dark:shadow-[0_-4px_20px_-4px_rgba(243,198,35,0.15)]">
  <div className="container px-4 py-6">
        {/* Mobile and Tablet Layout */}
        <div className="flex flex-col space-y-4 md:hidden">
          <div className="text-center">
            <div className="flex items-center font-bold text-lg mb-2">
              <img 
                src="/10xswap_logo.png" 
                alt="10xSwap Logo" 
                className="h-10 w-10 mr-2"
              />
              <span className="text-primary dark:text-[#F3C623]">10x</span>
              <span className="dark:text-white">Swap</span>
            </div>

            <p className="text-xs text-muted-foreground dark:text-[#F3C623]/60">
              © {new Date().getFullYear()} 10xSwap. All rights reserved.
            </p>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-4 text-sm" aria-label="Footer links" />
          
          {/* Centered Guidelines on mobile */}
          <div className="flex justify-center">
            <GuidelinesBubble />
          </div>
          
          <div className="flex justify-center gap-4 items-center">
            <Link href="https://x.com/Dev_anik2003" className="text-muted-foreground hover:text-primary dark:text-[#F3C623]/60 dark:hover:text-[#F3C623] transition-colors">
              <Twitter className="h-6 w-6" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link href="https://github.com/ansu555/10x_Swap" className="text-muted-foreground hover:text-primary dark:text-[#F3C623]/60 dark:hover:text-[#F3C623] transition-colors">
              <Github className="h-6 w-6" />
              <span className="sr-only">GitHub</span>
            </Link>
            <Link href="https://www.linkedin.com/in/anikdas2003/" className="text-muted-foreground hover:text-primary dark:text-[#F3C623]/60 dark:hover:text-[#F3C623] transition-colors">
              <Linkedin className="h-6 w-6" />
              <span className="sr-only">LinkedIn</span>
            </Link>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid h-10 grid-cols-3 items-center">
          <div className="flex items-center gap-3 justify-self-start">
            <div className="flex items-center font-bold text-lg mb-2">
              <img 
                src="/10xswap_logo.png" 
                alt="10xSwap Logo" 
                className="h-10 w-10 mr-2"
              />
              <span className="text-primary dark:text-[#F3C623]">10x</span>
              <span className="dark:text-white">Swap</span>
            </div>

            <p className="text-xs text-muted-foreground dark:text-[#F3C623]/60 ml-4">
              © {new Date().getFullYear()} 10xSwap. All rights reserved.
            </p>
          </div>
          {/* Center: Guidelines bubble truly centered */}
          <div className="flex items-center justify-center justify-self-center">
            <GuidelinesBubble />
          </div>
          <div className="flex gap-4 items-center justify-self-end">
            <Link href="https://x.com/Dev_anik2003" className="text-muted-foreground hover:text-primary dark:text-[#F3C623]/60 dark:hover:text-[#F3C623] transition-colors">
              <Twitter className="h-6 w-6" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link href="https://github.com/ansu555/crypto-market" className="text-muted-foreground hover:text-primary dark:text-[#F3C623]/60 dark:hover:text-[#F3C623] transition-colors">
              <Github className="h-6 w-6" />
              <span className="sr-only">GitHub</span>
            </Link>
            <Link href="https://www.linkedin.com/in/anikdas2003/" className="text-muted-foreground hover:text-primary dark:text-[#F3C623]/60 dark:hover:text-[#F3C623] transition-colors">
              <Linkedin className="h-6 w-6" />
              <span className="sr-only">LinkedIn</span>
            </Link>
            <Link href="mailto:anik200365@gmail.com" className="text-muted-foreground hover:text-primary dark:text-[#F3C623]/60 dark:hover:text-[#F3C623] transition-colors">
              <Mail className="h-6 w-6" />
              <span className="sr-only">Email</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
