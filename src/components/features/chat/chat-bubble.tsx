"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { MessageCircle, Send, Bot, X } from "lucide-react"
import { useWalletConnection } from "@/components/providers/txnlab-wallet-provider"

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
  const [activeImage, setActiveImage] = useState<{ src: string; alt?: string } | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const { activeAccount } = useWalletConnection()
  const address = activeAccount?.address
  const chainId = 1 // Algorand mainnet/testnet identifier

  const scrollToEnd = useCallback(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [])
  useEffect(() => { scrollToEnd() }, [messages, scrollToEnd])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  useEffect(() => {
    if (!activeImage) return
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveImage(null)
      }
    }
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [activeImage])

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

  const chainLabel = 'Algorand Testnet'
  const explorerBase = 'https://testnet.algoexplorer.io'
  const nativeSymbol = 'ALGO'

  const renderImage = (url: string, alt: string, key: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setActiveImage({ src: url, alt })}
      className="group mt-2 block overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition hover:border-red-400/60 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 dark:border-white/10 dark:bg-white/5 dark:hover:border-[#F3C623]/60"
    >
      <img
        src={url}
        alt={alt || "Shared image"}
        className="max-h-72 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
    </button>
  )

  const renderTextWithUrls = (segment: string, keyPrefix: string) => {
    const nodes: React.ReactNode[] = []
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const imageExtensionRegex = /(\.png|\.jpe?g|\.gif|\.svg|\.webp|\.avif)(\?.*)?$/i
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = urlRegex.exec(segment)) !== null) {
      const [fullUrl] = match
      if (match.index > lastIndex) {
        nodes.push(segment.slice(lastIndex, match.index))
      }

      if (imageExtensionRegex.test(fullUrl)) {
        nodes.push(renderImage(fullUrl, "Shared image", `${keyPrefix}-img-${match.index}`))
      } else {
        nodes.push(
          <a
            key={`${keyPrefix}-link-${match.index}`}
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className="text-red-500 underline underline-offset-2 transition hover:text-red-600 dark:text-[#F3C623] dark:hover:text-[#F3C623]/90"
          >
            {fullUrl}
          </a>
        )
      }
      lastIndex = match.index + fullUrl.length
    }

    if (lastIndex < segment.length) {
      nodes.push(segment.slice(lastIndex))
    }

    return nodes
  }

  const renderWithAddresses = (segment: string, keyPrefix: string) => {
    const nodes: React.ReactNode[] = []
    const addressRegex = /([A-Z2-7]{58})/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = addressRegex.exec(segment)) !== null) {
      const [address] = match
      if (match.index > lastIndex) {
        nodes.push(...renderTextWithUrls(segment.slice(lastIndex, match.index), `${keyPrefix}-txt-${match.index}`))
      }
      nodes.push(
        <a
          key={`${keyPrefix}-addr-${match.index}`}
          href={`${explorerBase}/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="text-red-500 underline underline-offset-2 transition hover:text-red-600 dark:text-[#F3C623] dark:hover:text-[#F3C623]/90"
        >
          {address}
        </a>
      )
      lastIndex = match.index + address.length
    }

    if (lastIndex < segment.length) {
      nodes.push(...renderTextWithUrls(segment.slice(lastIndex), `${keyPrefix}-tail`))
    }

    return nodes
  }

  const renderContent = (text: string) => {
    const markdownImageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g
    const pieces: React.ReactNode[] = []
    const lines = text.split("\n")

    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        pieces.push(<br key={`br-${lineIndex}`} />)
      }

      let lastIndex = 0
      const matches = Array.from(line.matchAll(markdownImageRegex))

      if (matches.length === 0) {
        pieces.push(...renderWithAddresses(line, `line-${lineIndex}`))
        return
      }

      matches.forEach((match, matchIndex) => {
        const [full, alt, url] = match
        const start = match.index ?? 0
        if (start > lastIndex) {
          pieces.push(...renderWithAddresses(line.slice(lastIndex, start), `line-${lineIndex}-seg-${matchIndex}`))
        }
        pieces.push(renderImage(url, alt, `md-img-${lineIndex}-${matchIndex}`))
        lastIndex = start + full.length
      })

      if (lastIndex < line.length) {
        pieces.push(...renderWithAddresses(line.slice(lastIndex), `line-${lineIndex}-tail`))
      }
    })

    return pieces
  }

  const presets: { label: string; prompt: string }[] = [
    { label: "My address", prompt: "what's my address?" },
    { label: `${nativeSymbol} balance`, prompt: "get my balances" },
    { label: "USDC balance", prompt: "get my USDC balance" },
    { label: "Swap", prompt: `swap 5 USDC to ${nativeSymbol}` },
    { label: "Transfer", prompt: `transfer 0.01 ${nativeSymbol} to AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ` },
  ]

  const usePreset = (p: string, autoSend = true) => {
    setInput(p)
    if (autoSend) setTimeout(() => send(), 0)
  }

  const isFooter = variant === "footer"
  const wrapperClass = isFooter ? (align === "left" ? "relative mr-auto" : "relative ml-auto") : undefined
  const buttonClass = isFooter
    ? "relative z-[140] grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-xl shadow-red-500/20 focus:outline-none dark:from-[#F3C623] dark:to-[#D9A800] dark:shadow-[#F3C623]/20"
    : "fixed bottom-6 right-6 z-[140] grid h-14 w-14 place-items-center rounded-full bg-white/80 text-slate-900 shadow-xl shadow-slate-900/15 ring-1 ring-white/60 backdrop-blur-2xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:ring-white/80 dark:bg-[#1c1c1c]/80 dark:text-white dark:shadow-black/40 dark:ring-white/10"
  const panelClass = isFooter
    ? (align === "left"
        ? "absolute bottom-[calc(100%+0.5rem)] left-0 z-[150] flex h-[34rem] w-[26rem] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 text-slate-900 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#171717]/90 dark:text-slate-100"
        : "absolute bottom-[calc(100%+0.5rem)] right-0 z-[150] flex h-[34rem] w-[26rem] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 text-slate-900 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#171717]/90 dark:text-slate-100")
  : "fixed right-0 top-16 sm:top-20 bottom-4 sm:bottom-6 z-[150] flex w-full max-w-[28rem] flex-col overflow-hidden rounded-l-3xl border border-white/60 bg-gradient-to-br from-white/90 via-white/80 to-white/60 text-slate-900 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.35)] backdrop-blur-3xl dark:border-white/5 dark:bg-gradient-to-br dark:from-[#1a1a1a]/90 dark:via-[#111]/85 dark:to-[#0b0b0b]/80 dark:text-slate-100"

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
        <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-red-500/20 via-transparent to-red-500/50 blur-lg" aria-hidden />
        <MessageCircle className="relative h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {open && !isFooter && (
          <motion.div
            key="chat-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-[12px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {activeImage && (
          <motion.div
            key="chat-image-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => setActiveImage(null)}
            className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/80 p-6 backdrop-blur-md"
            aria-modal
            role="dialog"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              onClick={(event) => event.stopPropagation()}
              className="relative max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/40 bg-black/40 shadow-2xl backdrop-blur-xl"
            >
              <img
                src={activeImage.src}
                alt={activeImage.alt || "Expanded chat image"}
                className="h-full w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setActiveImage(null)}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
              {activeImage.alt && (
                <div className="absolute bottom-0 w-full bg-black/50 px-4 py-3 text-sm text-white/90">
                  {activeImage.alt}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={isFooter ? { opacity: 0, y: 16, scale: 0.98 } : { x: "100%", opacity: 0 }}
            animate={isFooter ? { opacity: 1, y: 0, scale: 1 } : { x: 0, opacity: 1 }}
            exit={isFooter ? { opacity: 0, y: 16, scale: 0.98 } : { x: "100%", opacity: 0 }}
            transition={isFooter ? { type: "spring", stiffness: 260, damping: 22 } : { type: "spring", stiffness: 260, damping: 28 }}
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
                          <li>address — your Algorand account address</li>
                          <li>balance — e.g. get my balances | get my USDC balance | balance ASA_ID</li>
                          <li>price — e.g. ALGO/BTC/SOL or names like "solana"</li>
                          <li>gas price — current transaction fees on Algorand</li>
                          <li>swap — e.g. swap 5 USDC to {nativeSymbol}</li>
                          <li>transfer — e.g. transfer 0.01 ALGO to AAAAA... (valid Algorand address required)</li>
                        </ul>
                      </div>
                      <div>
                        <div className="mb-1 font-medium text-slate-900 dark:text-slate-200">Tips</div>
                        <ul className="list-disc space-y-1 pl-5">
                          <li>Prefer token symbols (ALGO, USDC, USDT, DAI).</li>
                          <li>Keep queries short and specific.</li>
                          <li>For unknown tokens, use the ASA ID number.</li>
                        </ul>
                      </div>
                      <div>
                        <div className="mb-1 font-medium text-slate-900 dark:text-slate-200">Important</div>
                        <ul className="list-disc space-y-1 pl-5">
                          <li>Transfers require a valid Algorand address (58 characters).</li>
                          <li>Runs on {chainLabel}.</li>
                          <li>Balances are shown to 4 decimals; small USD values may round to $0.01.</li>
                          <li>Powered by Algorand blockchain integration.</li>
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
                  Ask things like: "what's my address?", "check my USDC balance", "price of solana", "gas price", "swap 5 USDC to ALGO".
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
