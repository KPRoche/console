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
  pollInterval: number = 5000
) {
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState<HistogramData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistogram = useCallback(async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/result/histogram?sort=${sortBy}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      // Silently ignore 429 (rate limit) — don't report as error, just skip this poll
      if (res.status === 429) {
        setIsLoading(false)
        return
      }

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
      // Detect if we got HTML (loading page) instead of JSON — this means the backend
      // is temporarily unhealthy. Don't report an error, just silently skip this poll
      // and try again next time.
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch histogram'
      if (errMsg.includes("<!doctype") || errMsg.includes("Unexpected token '<'")) {
        console.debug('[useResultHistogram] Got HTML (backend loading), retrying next poll')
        setIsLoading(false)
        return
      }
      console.error('[useResultHistogram] Fetch error:', errMsg, err)
      setError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, sortBy])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchHistogram()
    const timer = setInterval(fetchHistogram, pollInterval)
    return () => clearInterval(timer)
  }, [isAuthenticated, sortBy, pollInterval])

  return { data, isLoading, error, refetch: fetchHistogram }
}
