import { createContext, useContext } from 'react'

/**
 * Global context to pause/resume quantum card polling.
 * Used when dashboard settings modal is open to prevent UI thrashing from constant updates.
 */
interface QuantumPollingContextType {
  pausePolling: boolean
  setPausePolling: (paused: boolean) => void
}

export const QuantumPollingContext = createContext<QuantumPollingContextType>({
  pausePolling: false,
  setPausePolling: () => {}, // no-op default
})

export function useQuantumPolling() {
  return useContext(QuantumPollingContext)
}

/**
 * Global module-level flag to pause quantum polling.
 * Used as fallback when context is not available.
 */
let globalQuantumPollingPaused = false

export function setGlobalQuantumPollingPaused(paused: boolean) {
  globalQuantumPollingPaused = paused
}

export function isGlobalQuantumPollingPaused(): boolean {
  return globalQuantumPollingPaused
}
