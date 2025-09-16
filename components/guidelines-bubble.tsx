"use client"
import React, { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BookOpen, X } from "lucide-react"
import { FUJI_SYMBOL_TO_TOKEN } from "@/lib/tokens"
import { useChainId } from "wagmi"

export default function GuidelinesBubble() {
  const [open, setOpen] = useState(false)
  const chainId = useChainId() || 43113
  const chainLabel = 'Avalanche Fuji'
  const nativeSymbol = 'AVAX'
  const TOKENS = FUJI_SYMBOL_TO_TOKEN
  // Dynamically list all known tokens for the selected chain
  const SUPPORTED: string[] = Object.keys(TOKENS || {})

  return (
    <div className="relative mx-auto">
      <motion.button
        aria-label="Open guidelines"
        onClick={() => setOpen((v) => !v)}
        className="relative z-40 grid h-9 w-28 place-items-center rounded-full border border-slate-200/50 bg-white/80 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span>Guidelines</span>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="guidelines-panel"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="absolute bottom-[calc(100%+0.5rem)] left-1/2 z-50 w-[28rem] -translate-x-1/2 overflow-hidden rounded-2xl bg-white/95 p-4 text-slate-900 shadow-lg backdrop-blur-xl dark:bg-[#171717]/95 dark:text-slate-100"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-red-500 dark:text-[#F3C623]" />
                Quick guidelines
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Supported tokens */}
              <section>
                <div className="font-semibold mb-1">Supported tokens ({chainLabel})</div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {SUPPORTED.map((sym) => {
                    const t = TOKENS[sym]
                    const addr = t?.address === "AVAX" ? "native" : t?.address
                    return (
                      <li key={sym} className="flex justify-between">
                        <span className="font-medium">{sym}</span>
                        <span className="truncate">{addr || '—'}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>

              {/* Production issues */}
              <section>
                <div className="font-semibold mb-1">Problem you are going to face in production build not in local</div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  In production build on Vercel, we can't run cron jobs multiple times in the free version — only once per day.  
                  So the condition check (cooldown) when creating a rule will only run once in production.  
                  In local build, cron can run every 1 minute.  
                  <br />
                  To check locally:
                  <code className="block mt-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">npm run build:poller</code>
                  <code className="block mt-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">npm run dev:cron</code>
                </p>
              </section>

              {/* Smart account */}
              <section>
                <div className="font-semibold mb-1">Why Execute may not run</div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  The smart account function is shared across all users for now (may change in future).  
                  You see the same smart account because it is created with the server/agent key, not the connected wallet.  
                  Ensure the smart account has enough {nativeSymbol} for approvals when gasless isn’t available.  
                  {chainId === 43113 ? '0xGasless support on Fuji may be limited.' : ''}
                </p>
              </section>

              {/* API issues */}
              <section>
                <div className="font-semibold mb-1">API related errors</div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  If you see any API reader errors, most probably the limit has been surpassed.  
                  In that situation, contact me and let me know.
                </p>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
