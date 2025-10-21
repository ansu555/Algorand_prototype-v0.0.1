// components/providers.tsx
'use client'

import React, { ReactNode } from 'react'
import { Web3Providers } from '@/components/web3/Web3Providers'
import { ThemeProvider } from '@/components/shared/theme-provider'
import BackgroundPaths from '@/components/shared/animated-background'

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
