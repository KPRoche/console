import React, { useEffect, useState } from 'react'
import { CardWrapper } from './CardWrapper'
import { useCardLoadingState } from './CardDataContext'
import { Skeleton } from '../ui/Skeleton'

interface QuantumCircuitViewerProps {
  isDemoData?: boolean
}

export const QuantumCircuitViewer: React.FC<QuantumCircuitViewerProps> = ({ isDemoData = false }) => {
  const [circuitImage, setCircuitImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFailed, setIsFailed] = useState(false)

  const { showSkeleton } = useCardLoadingState({
    isLoading,
    hasAnyData: circuitImage !== null,
    isFailed,
    consecutiveFailures: isFailed ? 1 : 0,
    isDemoData,
  })

  useEffect(() => {
    const fetchCircuit = async () => {
      try {
        setIsLoading(true)
        setIsFailed(false)
        const response = await fetch('http://localhost:5000/api/qasm/circuit/png')
        if (!response.ok) {
          throw new Error(`Failed to fetch circuit: ${response.statusText}`)
        }
        const blob = await response.blob()
        const imageUrl = URL.createObjectURL(blob)
        setCircuitImage(imageUrl)
      } catch (error) {
        console.error('Error fetching quantum circuit:', error)
        setIsFailed(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCircuit()
    const interval = setInterval(fetchCircuit, 5000)
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
        {circuitImage ? (
          <div className="flex justify-center items-center overflow-auto">
            <img
              src={circuitImage}
              alt="Quantum Circuit Diagram"
              className="max-w-full h-auto object-contain"
              style={{ maxHeight: '600px' }}
            />
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