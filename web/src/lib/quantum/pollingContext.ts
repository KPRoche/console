import { createContext, useContext } from 'react'

interface QuantumPollingContextType {
  pausePolling: boolean
  setPausePolling: (paused: boolean) => void
}

export const QuantumPollingContext = createContext<QuantumPollingContextType>({
  pausePolling: false,
  setPausePolling: () => {},
})

export function useQuantumPolling() {
  return useContext(QuantumPollingContext)
}
