import React from 'react'
import { ExternalLink } from 'lucide-react'
import { useCardLoadingState } from '../CardDataContext'
import { Skeleton } from '../../ui/Skeleton'
import { isQuantumForcedToDemo } from '../../../lib/demoMode'
import { useAuth } from '../../../lib/auth'
import {
  useQuantumCircuitAscii,
  QUANTUM_CIRCUIT_DEFAULT_POLL_MS,
} from '../../../hooks/useCachedQuantum'

const CIRCUIT_ASCII_POLLING_INTERVAL_MS = QUANTUM_CIRCUIT_DEFAULT_POLL_MS

interface QuantumCircuitViewerProps {
  isDemoData?: boolean
}

const CIRCUIT_ZOOM_STORAGE_KEY = 'quantum-circuit-zoom'

export const QuantumCircuitViewer: React.FC<QuantumCircuitViewerProps> = ({ isDemoData = false }) => {
  const { isAuthenticated, login, isLoading: authIsLoading } = useAuth()
  const forceDemo = isDemoData || isQuantumForcedToDemo()
  const {
    data,
    isLoading,
    isRefreshing,
    isDemoData: isCachedDemoData,
    error,
    isFailed,
    consecutiveFailures,
  } = useQuantumCircuitAscii({
    isAuthenticated,
    forceDemo,
    pollInterval: CIRCUIT_ASCII_POLLING_INTERVAL_MS,
  })

  const [zoomLevel, setZoomLevel] = React.useState(() => {
    const stored = localStorage.getItem(CIRCUIT_ZOOM_STORAGE_KEY)
    return stored ? parseInt(stored, 10) : 100
  })

  const handleZoomChange = (pct: number) => {
    setZoomLevel(pct)
    localStorage.setItem(CIRCUIT_ZOOM_STORAGE_KEY, pct.toString())
  }

  const circuitAscii = data?.circuitAscii ?? null
  const effectiveIsDemoData = isAuthenticated ? isCachedDemoData : false
  const { showSkeleton } = useCardLoadingState({
    isLoading: isLoading && circuitAscii === null,
    hasAnyData: circuitAscii !== null,
    isFailed,
    consecutiveFailures,
    isDemoData: effectiveIsDemoData,
    isRefreshing,
  })

  if (authIsLoading) {
    return (
      <div className="p-4">
        <Skeleton variant="text" width="80%" height={24} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
        <p className="text-gray-500">Please log in to view quantum data</p>
        <button
          onClick={login}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Continue with GitHub
        </button>
      </div>
    )
  }

  if (showSkeleton) {
    return (
      <div className="p-4">
        <Skeleton variant="text" width="80%" height={24} />
      </div>
    )
  }

  const zoomPercentages = [25, 40, 50, 60, 70, 85, 100, 130, 160]

  const handlePopout = () => {
    window.open('http://localhost:30500/api/qasm/circuit/ascii', '_blank')
  }

  return (
    <div className="p-4">
      {circuitAscii ? (
        <>
          <div className="flex gap-2 mb-1 items-center justify-between">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Zoom:</span>
              <div className="flex gap-1">
                {zoomPercentages.map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleZoomChange(pct)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      zoomLevel === pct
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-secondary'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handlePopout}
              className="p-1 hover:bg-secondary rounded transition-colors"
              title="Open circuit in new window"
              aria-label="Open circuit in new window"
            >
              <ExternalLink size={16} className="text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <div className="bg-card rounded border border-border overflow-x-auto">
            <pre
              className="p-4 m-0 whitespace-pre text-foreground quantum-circuit-display"
              style={{
                minWidth: 'fit-content',
                fontSize: `${zoomLevel}%`,
              }}
            >
              {circuitAscii}
            </pre>
          </div>
        </>
      ) : (
        <div className="text-center text-muted-foreground">
          <p>{error ?? 'Unable to load quantum circuit diagram'}</p>
        </div>
      )}
    </div>
  )
}