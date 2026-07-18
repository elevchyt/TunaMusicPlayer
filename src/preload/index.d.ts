import type { TunaApi } from './index'

declare global {
  interface Window {
    tuna: TunaApi
  }
}

export {}
