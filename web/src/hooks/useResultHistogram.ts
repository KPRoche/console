import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth'

export interface HistogramEntry {
  pattern: string
  count: number
  probability: number
}

export interface HistogramData {
  histogram: HistogramEntry[]
  sort: string
  num_patterns: number
  total_shots: number
  num_qubits: number | null
  timestamp: string | null
  backend: string | null
  backend_type: string | null
  execution_sequence: number | null
}

export function useResultHistogram(
  sortBy: 'count' | 'pattern' = 'count',
  pollInterval: number = 2000
) {
  const { token } = useAuth()
  const [data, setData] = useState<HistogramData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistogram = useCallback(async () => {
    if (!token) return

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/result/histogram?sort=${sortBy}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch histogram (${res.status})`)
      }

      const json = await res.json()
      if (json.warning) {
        setData(null)
      } else {
        setData(json as HistogramData)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch histogram')
    } finally {
      setIsLoading(false)
    }
  }, [token, sortBy])

  useEffect(() => {
    if (!token) return
    fetchHistogram()
    const timer = setInterval(fetchHistogram, pollInterval)
    return () => clearInterval(timer)
  }, [token, fetchHistogram, pollInterval])

  return { data, isLoading, error, refetch: fetchHistogram }
}
