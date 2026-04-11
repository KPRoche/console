import React from 'react'
import { CardWrapper } from './CardWrapper'
import { useCardLoadingState } from './CardDataContext'
import { Skeleton } from '../ui/Skeleton'

interface QuantumCircuitViewerProps {
  isDemoData?: boolean
}

export const QuantumCircuitViewer: React.FC<QuantumCircuitViewerProps> = ({ isDemoData = false }) => {
  const { showSkeleton } = useCardLoadingState({
    isLoading: false,
    hasAnyData: true,
    isFailed: false,
    consecutiveFailures: 0,
    isDemoData,
  })

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
      <div className="p-4 text-center text-muted-foreground">
        <p>Quantum Circuit Viewer - Coming soon</p>
        <p className="text-sm mt-2">This card will display quantum circuit diagrams and execution results.</p>
      </div>
    </CardWrapper>
  )
}