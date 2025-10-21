"use client"
/**
 * DEPRECATED: This landing page has been removed from the homepage routing.
 * It is kept here for potential future reuse (hero Spline background demo).
 * To restore: import it in `app/page.tsx` and render <LandingPage />.
 * If you decide it's no longer needed, you can safely delete this file.
 */

import React, { Suspense, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, Wallet, Brain, TrendingUp, Shield, BarChart3, Zap, Target, Lock, ArrowRight, Sparkles, Star } from 'lucide-react'
import Spline from '@splinetool/react-spline'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'

// Placeholder for Spline scene - replace with your actual exported scene URL
const SPLINE_SCENE_URL = "https://prod.spline.design/Xr35zI45MTLZO09L/scene.splinecode"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section with Spline 3D Scene */}
      <section className="relative h-[100dvh] w-screen overflow-hidden p-0 m-0">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-slate-800 dark:to-slate-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400">Loading 3D Scene...</p>
            </div>
          </div>
        }>
          {/* Fixed full-viewport Spline background */}
          <div className="fixed inset-0 -z-10 w-screen h-screen">
            <Spline
              scene={SPLINE_SCENE_URL}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                objectFit: 'cover',
                display: 'block',
                pointerEvents: 'none'
              }}
            />
            {/* Optional radial vignette mask for readability */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.35)_70%,rgba(0,0,0,0.55)_100%)] mix-blend-normal" />
          </div>

          {/* Center overlay content area (empty for now) */}
          <div className="relative z-10 flex items-center justify-center h-[100dvh] w-full pointer-events-none">
            {/* Place hero heading/buttons here if desired */}
          </div>
        </Suspense>
      </section>

      {/* Screenshot Section */}
      <section className="py-16 sm:py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              See It In Action
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Experience the power of automated trading with our intuitive interface
            </p>
          </div>
          
          <div className="relative max-w-6xl mx-auto">
            <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Placeholder for screenshot - replace with actual screenshot */}
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-slate-800 dark:to-slate-900">
                <div className="text-center">
                  <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">App Screenshot</h3>
                  <p className="text-slate-600 dark:text-slate-300">16:9 aspect ratio placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Empower Your Workflow
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Connect your wallet and set your trading preferences. Our AI then monitors markets, picks the best swaps, and automates your trades.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Card 1 */}
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-xl text-slate-900 dark:text-white">1. Connect & Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Link your wallet, set trading goals, and choose preferences.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl text-slate-900 dark:text-white">2. AI Monitors & Analyzes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Our AI tracks markets in real time and identifies the best swap opportunities.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-xl text-slate-900 dark:text-white">3. Auto-Trade & Grow</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Trades are executed automatically, keeping your portfolio optimized 24/7.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Powerful Features
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Everything you need for successful automated trading
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Feature 1 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-xl text-slate-900 dark:text-white">AI-Powered Autopilot</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Trade automatically while our AI analyzes the market in real time, executes buy/sell orders, and optimizes your portfolio around the clock.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl text-slate-900 dark:text-white">Best Swap Finder</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Our platform compares multiple exchanges to ensure you always get the best rates for swaps, maximizing your profits effortlessly.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-xl text-slate-900 dark:text-white">Smart Price Triggers</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Set custom price alerts and automated triggers so trades happen exactly when your conditions are met — no manual monitoring required.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-xl text-slate-900 dark:text-white">Portfolio Analytics & Rebalancing</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Track your holdings, monitor performance, and let the system automatically rebalance your portfolio to match your growth goals.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-xl text-slate-900 dark:text-white">Secure & Non-Custodial</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Your funds remain fully under your control. Connect wallets safely, access your account across devices, and trade confidently with robust security.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Everything you need to know about 10xSwap
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {[
              {
                question: "What is this app?",
                answer: "It's an AI-powered crypto trading platform that automates trades, finds the best swap rates, and manages your portfolio 24/7."
              },
              {
                question: "How does the AI autopilot work?",
                answer: "Our AI monitors multiple exchanges in real time, analyzes market trends, and executes trades based on your pre-set strategies and price triggers."
              },
              {
                question: "Do I need to deposit my funds into the app?",
                answer: "No. The platform is non-custodial, meaning you always retain full control of your crypto in your own wallet."
              },
              {
                question: "Which wallets are supported?",
                answer: "We support popular Web3 wallets like MetaMask, Trust Wallet, and any wallet compatible with Ethereum/Avalanche C-Chain."
              },
              {
                question: "Can I set custom trading rules?",
                answer: "Yes! You can define price triggers, risk levels, and trading strategies. The AI will follow these rules automatically."
              },
              {
                question: "Is my trading safe?",
                answer: "Absolutely. Since the platform is non-custodial, your funds never leave your wallet. All transactions are executed via smart contracts."
              },
              {
                question: "Can I use it on mobile?",
                answer: "Yes. The platform is accessible via web and mobile browsers, with responsive design for smooth operation on any device."
              },
              {
                question: "What exchanges are supported?",
                answer: "The app integrates with multiple DEXs to find the best swap rates for your trades (e.g., Trader Joe, Pangolin, and other Avalanche-based platforms)."
              },
              {
                question: "Do I need to monitor trades manually?",
                answer: "No. Once your preferences are set, the AI autopilot monitors the market and executes trades automatically, even while you're offline."
              }
            ].map((faq, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 dark:text-slate-300">
                    {faq.answer}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
    </div>
  )
}
