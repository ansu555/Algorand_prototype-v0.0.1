"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { MessageCircle, Send, Bot, X } from "lucide-react"
import { useAccount, useChainId } from "wagmi"

type Msg = { role: "user" | "assistant"; content: string }

type ChatBubbleProps = {
  variant?: "floating" | "footer"
  align?: "left" | "right"
}

export default function ChatBubble({ variant = "floating", align = "right" }: ChatBubbleProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | undefined>(undefined)
  const [showRules, setShowRules] = useState(true)
  const endRef = useRef<HTMLDivElement | null>(null)
  const { address } = useAccount()
  const chainId = useChainId() || 43113

  const scrollToEnd = useCallback(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [])
  useEffect(() => { scrollToEnd() }, [messages, scrollToEnd])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    setMessages((m) => [...m, { role: "user", content: text }])
    setLoading(true)
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, { role: "user", content: text }], threadId, walletAddress: address, chainId }),
      })
      const json = await res.json()
      if (json?.ok) {
        if (!threadId && json.threadId) setThreadId(json.threadId)
        setMessages((m) => [...m, { role: "assistant", content: String(json.content || "") }])
      } else {
        setMessages((m) => [...m, { role: "assistant", content: `Error: ${json?.error || res.status}` }])
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${e?.message || e}` }])
    } finally {
      setLoading(false)
    }
  }

  const typing = loading

  const chainLabel = chainId === 8453 ? 'Base' : chainId === 43114 ? 'Avalanche' : 'Avalanche Fuji'
  const explorerBase = chainId === 8453 ? 'https://basescan.org' : (chainId === 43114 ? 'https://snowtrace.io' : 'https://testnet.snowtrace.io')
  const nativeSymbol = (chainId === 43113 || chainId === 43114) ? 'AVAX' : 'ETH'

  const renderContent = (text: string) => {
    const re = /(0x[a-fA-F0-9]{64})|(0x[a-fA-F0-9]{40})/g
    const out: React.ReactNode[] = []
    let lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const [match, tx, addr] = m
      if (m.index > lastIndex) out.push(text.slice(lastIndex, m.index))
      if (tx) {
        out.push(
          <a key={`${m.index}-tx`} href={`${explorerBase}/tx/${tx}`} target="_blank" rel="noreferrer" className="text-red-600 underline underline-offset-2 dark:text-[#F3C623]">
            {tx}
          </a>
        )
      } else if (addr) {
        out.push(
          <a key={`${m.index}-addr`} href={`${explorerBase}/address/${addr}`} target="_blank" rel="noreferrer" className="text-red-500 underline underline-offset-2 dark:text-[#F3C623]">
            {addr}
          </a>
        )
      }
      lastIndex = m.index + match.length
    }
    if (lastIndex < text.length) out.push(text.slice(lastIndex))
    return out
  }

  const presets: { label: string; prompt: string }[] = [
    { label: "My address", prompt: "what's my address?" },
  { label: `${nativeSymbol} balance`, prompt: "get my balances" },
    { label: "USDC balance", prompt: "get my USDC balance" },
    { label: "Swap", prompt: `swap 5 USDC to ${nativeSymbol}` },
    { label: "Transfer", prompt: `transfer 0.01 ${nativeSymbol} to 0x0000000000000000000000000000000000000000` },
  ]

  const usePreset = (p: string, autoSend = true) => {
    setInput(p)
    if (autoSend) setTimeout(() => send(), 0)
  }

  const isFooter = variant === "footer"
  const wrapperClass = isFooter ? (align === "left" ? "relative mr-auto" : "relative ml-auto") : undefined
  const buttonClass = isFooter
    ? "relative z-40 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-xl shadow-red-500/20 focus:outline-none dark:from-[#F3C623] dark:to-[#D9A800] dark:shadow-[#F3C623]/20"
    : "fixed bottom-8 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-xl shadow-red-500/20 focus:outline-none dark:from-[#F3C623] dark:to-[#D9A800] dark:shadow-[#F3C623]/20"
  const panelClass = isFooter
    ? (align === "left"
        ? "absolute bottom-[calc(100%+0.5rem)] left-0 z-50 flex h-[34rem] w-[26rem] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#171717]/95 dark:text-slate-100"
        : "absolute bottom-[calc(100%+0.5rem)] right-0 z-50 flex h-[34rem] w-[26rem] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#171717]/95 dark:text-slate-100")
    : "fixed bottom-32 right-5 z-50 flex h-[34rem] w-[26rem] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#171717]/95 dark:text-slate-100"

  return (
    <div className={wrapperClass}>
      {/* Trigger Button */}
      <motion.button
        aria-label="Open AI chat"
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="absolute inset-0 rounded-full bg-red-500/30 blur-xl -z-10 dark:bg-[#F3C623]/30" aria-hidden />
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -z-10 inline-flex h-full w-full animate-ping rounded-full bg-red-400/20 dark:bg-[#F3C623]/20" aria-hidden />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className={panelClass}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
                  <Bot className="h-4 w-4 text-red-400 dark:text-[#F3C623]" />
                </div>
                <div className="text-sm font-semibold">10xSwap AI Agent</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 sm:inline">{chainLabel}</span>
                <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick actions */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 border-b border-slate-200/60 px-3 pb-3 pt-2 dark:border-white/10">
                {presets.map((x) => (
                  <button
                    key={x.label}
                    onClick={() => usePreset(x.prompt)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:border-red-400/40 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white dark:hover:border-[#F3C623]/50"
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Guidelines */}
            {open && (
              <div className="border-b border-slate-200/60 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-200">Keep this in min(guideline generated by cursor)</span>
                  <button
                    onClick={() => setShowRules((v) => !v)}
                    className="rounded-md px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    {showRules ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showRules && (
                  <div className="relative rounded-lg border border-red-300/30 bg-red-50/80 p-2 dark:border-[#F3C623]/30 dark:bg-[#F3C623]/10">
                    <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-red-400/60 dark:bg-[#F3C623]/60" aria-hidden />
                    <div className="grid max-h-48 gap-2 overflow-y-auto pr-2 pl-2">
                      <div>
                        <div className="mb-1 font-medium text-slate-900 dark:text-slate-200">Supported actions</div>
                        <ul className="list-disc space-y-1 pl-5">
                          <li>address — your smart account address</li>
                          <li>balance — e.g. get my balances | get my USDC balance | balance 0x... (ERC-20)</li>
                          <li>price — e.g. ETH/BTC/SOL or names like “solana”</li>
                          <li>gas price — current gas on the active network</li>
                          <li>
                            swap — e.g. swap 5 USDC to {nativeSymbol}
                            {chainId === 43113 ? ' (not available on Fuji in this app)' : ''}
                          </li>
                          <li>transfer — e.g. transfer 0.01 ETH to 0x... (valid 0x address required)</li>
                        </ul>
                      </div>
                      <div>
                        <div className="mb-1 font-medium text-slate-900 dark:text-slate-200">Tips</div>
                        <ul className="list-disc space-y-1 pl-5">
                          <li>Prefer token symbols (ETH, USDC, WETH, DAI).</li>
                          <li>Keep queries short and specific.</li>
                          <li>For unknown tokens, paste the ERC-20 contract address.</li>
                        </ul>
                      </div>
                      <div>
                        <div className="mb-1 font-medium text-slate-900 dark:text-slate-200">Important</div>
                        <ul className="list-disc space-y-1 pl-5">
                          <li>Transfers require a valid 0x address; symbols are 2–6 letters.</li>
                          <li>Runs on {chainLabel}.</li>
                          <li>Balances are shown to 4 decimals; small USD values may round to $0.01.</li>
                          <li>Powered by 0xGasless actions (GetAddress, GetBalance, SendTransaction, SmartSwap, GetTokenDetails).</li>
                          <li>Never share secrets or private keys.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {messages.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  Ask things like: "what's my address?", "check my USDC balance", "price of solana", "gas price", "swap 5 USDC to ETH".
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="flex max-w-[85%] items-start gap-2">
                    {m.role === "assistant" && (
                      <div className="mt-1 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 sm:grid">
                        <Bot className="h-3.5 w-3.5 text-red-400 dark:text-[#F3C623]" />
                      </div>
                    )}
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-full rounded-2xl bg-gradient-to-br from-red-500 to-red-600 px-3 py-2 text-sm text-white shadow-md dark:from-[#F3C623] dark:to-[#D9A800]"
                          : "max-w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      }
                    >
                      <div className="whitespace-pre-wrap break-words">{renderContent(m.content)}</div>
                    </div>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.2s]" />
                    <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-slate-300" />
                    <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:0.2s]" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200/60 p-3 dark:border-white/10">
              <div className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-inner focus-within:border-red-400/40 dark:border-white/10 dark:bg-white/5 dark:focus-within:border-[#F3C623]/50">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey ? (e.preventDefault(), send()) : undefined}
                  placeholder={loading ? "Working..." : "Type a message"}
                  disabled={loading}
                  className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <motion.button
                  onClick={send}
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.05 }}
                  whileTap={{ scale: loading ? 1 : 0.95 }}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white shadow shadow-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:from-[#F3C623] dark:to-[#D9A800] dark:shadow-[#F3C623]/20"
                >
                  {loading ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
