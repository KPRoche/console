import React, { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { useReportCardDataState } from './CardDataContext'
import { isGlobalQuantumPollingPaused } from '../../lib/quantum/pollingContext'
import { useResultHistogram } from '../../hooks/useResultHistogram'

const HISTOGRAM_DEFAULT_POLL_MS = 2000
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4', '#6366f1']

export const QuantumHistogramCard: React.FC = () => {
  const [sortBy, setSortBy] = useState<'count' | 'pattern'>('count')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)
  const [refreshInterval, setRefreshInterval] = useState(HISTOGRAM_DEFAULT_POLL_MS)

  const { data, isLoading, error: hookError, refetch } = useResultHistogram(sortBy, refreshInterval)

  const isPaused = isGlobalQuantumPollingPaused()

  useEffect(() => {
    if (isPaused) {
      setRefreshInterval(Number.MAX_SAFE_INTEGER)
    } else {
      setRefreshInterval(HISTOGRAM_DEFAULT_POLL_MS)
    }
  }, [isPaused])

  useEffect(() => {
    if (hookError) {
      setError(hookError)
      setConsecutiveFailures(prev => prev + 1)
    } else {
      setError(null)
      setConsecutiveFailures(0)
    }
  }, [hookError])

  useReportCardDataState({
    isFailed: error !== null,
    consecutiveFailures,
    errorMessage: error || undefined,
    isLoading,
    hasData: (data?.histogram?.length ?? 0) > 0,
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  const handleSortChange = (newSort: 'count' | 'pattern') => {
    setSortBy(newSort)
  }

  if (!data) {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Execution Histogram</h3>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-accent/20 rounded-lg disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="text-center py-8 text-muted-foreground">
          <p>No execution results available yet</p>
          <p className="text-xs mt-2">Run a quantum circuit to see the histogram</p>
        </div>
      </div>
    )
  }

  const chartOption = {
    responsive: true,
    maintainAspectRatio: true,
    color: COLORS,
    grid: {
      left: '10%',
      right: '10%',
      top: '10%',
      bottom: '15%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const param = params[0]
        const pattern = data.histogram[param.dataIndex]?.pattern ?? ''
        const count = param.value
        const prob = data.histogram[param.dataIndex]?.probability ?? 0
        return `Pattern: ${pattern}<br/>Count: ${count}<br/>Probability: ${(prob * 100).toFixed(1)}%`
      },
    },
    xAxis: {
      type: 'category',
      data: (data.histogram || []).map(entry => entry.pattern),
      axisLabel: { rotate: 45, interval: 0 },
    },
    yAxis: {
      type: 'value',
      name: 'Counts',
    },
    series: [
      {
        data: (data.histogram || []).map(entry => entry.count),
        type: 'bar',
        itemStyle: {
          color: (params: any) => COLORS[params.dataIndex % COLORS.length],
        },
      },
    ],
  }

  return (
    <div className="p-4 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Execution Histogram</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 hover:bg-accent/20 rounded-lg disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sort Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => handleSortChange('count')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            sortBy === 'count'
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
          }`}
        >
          By Frequency
        </button>
        <button
          onClick={() => handleSortChange('pattern')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            sortBy === 'pattern'
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
          }`}
        >
          By Pattern
        </button>
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground flex gap-4">
        <span>Patterns: {data.num_patterns}</span>
        <span>Total Shots: {data.total_shots}</span>
        <span>Qubits: {data.num_qubits}</span>
      </div>

      {/* ECharts Vertical Bar Chart */}
      <div className="flex-1 min-h-[300px]">
        <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Timestamp */}
      {data.timestamp && (
        <div className="text-xs text-muted-foreground text-center">
          {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
