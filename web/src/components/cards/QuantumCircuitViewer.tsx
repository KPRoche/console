import React, { useEffect, useState } from 'react'
import { CardWrapper } from './CardWrapper'
import { useCardLoadingState } from './CardDataContext'
import { Skeleton } from '../ui/Skeleton'
import { isGlobalQuantumPollingPaused } from '../../lib/quantum/pollingContext'

const CIRCUIT_ASCII_POLLING_INTERVAL_MS = 5000

interface QuantumCircuitViewerProps {
  isDemoData?: boolean
}

export const QuantumCircuitViewer: React.FC<QuantumCircuitViewerProps> = ({ isDemoData = false }) => {
  const [circuitAscii, setCircuitAscii] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFailed, setIsFailed] = useState(false)

  const { showSkeleton } = useCardLoadingState({
    isLoading,
    hasAnyData: circuitAscii !== null,
    isFailed,
    consecutiveFailures: isFailed ? 1 : 0,
    isDemoData,
  })

  useEffect(() => {
    const fetchCircuit = async () => {
      // Skip fetch if polling is paused (e.g., dashboard settings modal open)
      if (isGlobalQuantumPollingPaused()) return

      try {
        setIsLoading(true)
        setIsFailed(false)
        const response = await fetch('http://localhost:30500/api/qasm/circuit/ascii')
        if (!response.ok) {
          throw new Error(`Failed to fetch circuit: ${response.statusText}`)
        }
        const html = await response.text()
        const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/)
        if (!preMatch) {
          throw new Error('No circuit data found in response')
        }
        setCircuitAscii(preMatch[1].trimEnd())
      } catch (error) {
        console.error('Error fetching quantum circuit:', error)
        setIsFailed(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCircuit()
    const interval = setInterval(fetchCircuit, CIRCUIT_ASCII_POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  if (showSkeleton) {
    return (
      <div className="p-4">
        <Skeleton variant="text" width="80%" height={24} />
      </div>
    )
  }

  return (
    <CardWrapper
      cardType="quantum_circuit_viewer"
      title="Quantum Circuit Viewer"
      isDemoData={isDemoData}
      isRefreshing={false}
    >
      <div className="p-4">
        {circuitAscii ? (
          <div className="overflow-auto bg-card rounded border border-border">
            <pre className="font-mono text-sm p-4 m-0 whitespace-pre text-foreground">
              {circuitAscii}
            </pre>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p>Unable to load quantum circuit diagram</p>
          </div>
        )}
      </div>
    </CardWrapper>
  )
}