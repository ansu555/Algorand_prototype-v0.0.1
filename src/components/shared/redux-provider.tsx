'use client'

import { Provider } from 'react-redux'
import store from '@/app/services/store' // <-- default import

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>
}