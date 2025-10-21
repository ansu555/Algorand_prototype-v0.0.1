// components/providers.tsx
'use client'

import React, { ReactNode } from 'react'
import { Web3Providers } from './web3/Web3Providers'
import { ThemeProvider } from './theme-provider'
import BackgroundPaths from './animated-background'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Web3Providers>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <BackgroundPaths />
        {children}
      </ThemeProvider>
    </Web3Providers>
  )
}
