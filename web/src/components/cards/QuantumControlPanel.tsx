import React, { useState, useEffect, useCallback } from 'react'
import { CardWrapper } from './CardWrapper'
import { AlertCircle, Play, RotateCcw, Zap } from 'lucide-react'
import { useReportCardDataState } from './CardDataContext'

interface ControlState {
  backend: string
  shots: number
  qasm_file: string
  executing: boolean
  loop_mode: boolean
  last_execution?: {
    job_id: string
    status: string
    timestamp: string
  }
}

interface CircuitInfo {
  num_qubits: number
  depth?: number
}

interface ControlSystem {
  command: string
  description: string
  status: string
  timestamp: string
}

interface SystemStatus {
  status: string
  running: boolean
  loop_running: boolean
  execution_mode: string
  loop_mode: boolean
  circuit_info?: CircuitInfo
  control_system?: ControlSystem
  backend_info?: {
    name: string
    shots: number
  } | null
  last_result?: {
    num_qubits: number
    shots: number
    counts: Record<string, number>
    timestamp: string
  } | null
  last_result_time?: string
  qasm_file?: string
  message: string
}

const DEMO_DATA: ControlState = {
  backend: 'aer',
  shots: 1024,
  qasm_file: 'expt.qasm',
  executing: false,
  loop_mode: false,
}

const DEMO_STATUS: SystemStatus = {
  status: 'ready',
  running: false,
  loop_running: false,
  execution_mode: 'control-based',
  loop_mode: false,
  circuit_info: {
    num_qubits: 2,
  },
  control_system: {
    command: 'idle',
    description: 'System idle, ready for commands',
    status: 'ready',
    timestamp: new Date().toISOString(),
  },
  backend_info: {
    name: 'aer',
    shots: 1024,
  },
  message: 'System ready',
}

export const QuantumControlPanel: React.FC = () => {
  const [control, setControl] = useState<ControlState>(DEMO_DATA)
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)
  const [hasInitialized, setHasInitialized] = useState(false)

  const isDemoFallback = consecutiveFailures >= 3

  useReportCardDataState({
    isLoading: isLoading && !isDemoFallback,
    isRefreshing,
    isDemoData: isDemoFallback,
    hasData: status !== null,
    isFailed: error !== null,
    consecutiveFailures,
  })

    // Fetch current status
  const fetchStatus = useCallback(async (isInitialLoad: boolean = false) => {
    try {
      setIsRefreshing(true)
      const res = await fetch('/api/quantum/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) throw new Error('Failed to fetch status')

      const data = await res.json()
      setStatus(data)
      setError(null)
      setConsecutiveFailures(0)

      // Fix #3: Only sync backend config on initial load, not on every poll
      // This prevents the shots value from being overwritten by user input
      if (isInitialLoad) {
        const backendInfo = data.backend_info || { name: control.backend, shots: control.shots }
        setControl(prev => ({
          ...prev,
          backend: backendInfo?.name || prev.backend,
          shots: backendInfo?.shots || prev.shots,
          loop_mode: data.loop_mode !== undefined ? data.loop_mode : prev.loop_mode,
        }))
      } else {
        // On subsequent polls, only update loop_mode, not shots
        setControl(prev => ({
          ...prev,
          loop_mode: data.loop_mode !== undefined ? data.loop_mode : prev.loop_mode,
        }))
      }
    } catch (err) {
      console.error('Error fetching status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setConsecutiveFailures(prev => {
        const newFailures = prev + 1
        if (newFailures >= 3) {
          setStatus(DEMO_STATUS)
        }
        return newFailures
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])//control.backend, control.shots])

  // Initialize on mount
  useEffect(() => {
    fetchStatus(true)
    setHasInitialized(true)
  }, [])

  // Set up polling interval
  useEffect(() => {
    if (!hasInitialized) return
    
    const interval = setInterval(() => fetchStatus(false), 1000)
    return () => clearInterval(interval)
  }, [hasInitialized, fetchStatus])

  const handleExecute = async () => {
    setControl(prev => ({ ...prev, executing: true }))
    try {
      const response = await fetch('/api/quantum/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qasm_file: control.qasm_file,
          backend: control.backend,
          shots: control.shots,
        }),
      })

      if (!response.ok) throw new Error('Execution failed')

      const result = await response.json()
      setControl(prev => ({
        ...prev,
        last_execution: {
          job_id: result.job_id,
          status: result.status,
          timestamp: new Date().toISOString(),
        },
      }))

      // Fix #2: Immediately poll job status to catch rapid completions
      // Only update status, don't update shots to preserve user input
      setTimeout(async () => {
        try {
          const statusRes = await fetch('/api/quantum/status', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
          if (statusRes.ok) {
            const data = await statusRes.json()
            setStatus(data)
            // Only update loop_mode, preserve shots user input
            setControl(prev => ({
              ...prev,
              loop_mode: data.loop_mode !== undefined ? data.loop_mode : prev.loop_mode,
            }))
          }
        } catch (err) {
          console.error('Error polling after execution:', err)
        }
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution error')
    } finally {
      setControl(prev => ({ ...prev, executing: false }))
    }
  }

  const handleLoopModeToggle = async () => {
    try {
      const endpoint = control.loop_mode ? '/api/quantum/loop/stop' : '/api/quantum/loop/start'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Failed to toggle loop mode')

      // Fix #1: Don't rely on response.loop_mode - refetch status instead
      await new Promise(resolve => setTimeout(resolve, 100))
      const statusRes = await fetch('/api/quantum/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setStatus(statusData)
        setControl(prev => ({
          ...prev,
          loop_mode: statusData.loop_mode || !prev.loop_mode,
        }))
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle loop mode')
    }
  }

  const displayStatus = status || DEMO_STATUS
  const isHealthy = displayStatus.status === 'ready' || displayStatus.loop_running

  return (
    <CardWrapper cardType="quantum_control_panel">
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500" />
          Quantum Control
        </h3>

        {error && !isDemoFallback && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Backend Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Backend
            </label>
            <select
              value={control.backend}
              onChange={e => setControl(prev => ({ ...prev, backend: e.target.value }))}
              disabled={control.executing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50"
            >
              <option value="aer">Aer Simulator</option>
              <option value="sim">QASM Simulator</option>
              <option value="qx5">IBM 5-qubit</option>
            </select>
          </div>

          {/* Shots Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Shots
            </label>
            <input
              type="number"
              min="1"
              max="1024"
              value={control.shots}
              onChange={e => {
                const value = parseInt(e.target.value)
                if (!isNaN(value) && value >= 1 && value <= 1024) {
                  setControl(prev => ({ ...prev, shots: value }))
                }
              }}
              disabled={control.executing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setControl(prev => ({ ...prev, shots: 100 }))}
                disabled={control.executing}
                className="flex-1 px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                100
              </button>
              <button
                onClick={() => setControl(prev => ({ ...prev, shots: 256 }))}
                disabled={control.executing}
                className="flex-1 px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                256
              </button>
              <button
                onClick={() => setControl(prev => ({ ...prev, shots: 512 }))}
                disabled={control.executing}
                className="flex-1 px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                512
              </button>
              <button
                onClick={() => setControl(prev => ({ ...prev, shots: 1024 }))}
                disabled={control.executing}
                className="flex-1 px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                1024
              </button>
            </div>
          </div>

          {/* QASM File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              QASM File
            </label>
            <input
              type="text"
              value={control.qasm_file}
              onChange={e => setControl(prev => ({ ...prev, qasm_file: e.target.value }))}
              disabled={control.executing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50"
            />
          </div>

          {/* Loop Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${control.loop_mode ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Loop Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{control.loop_mode ? 'Enabled - Continuous execution' : 'Disabled - Single execution'}</p>
              </div>
            </div>
            <button
              onClick={handleLoopModeToggle}
              disabled={control.executing}
              className={`relative w-12 h-7 rounded-full transition-colors ${control.loop_mode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'} disabled:opacity-50`}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${control.loop_mode ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={control.executing}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Play className="w-4 h-4" />
            {control.executing ? 'Executing...' : 'Execute Circuit'}
          </button>

          {/* Status Display */}
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">System Status</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`font-semibold ${isHealthy ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {displayStatus.loop_running ? 'loop_running' : displayStatus.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Running:</span>
                <span className={displayStatus.running ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}>
                  {displayStatus.running ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                  {displayStatus.execution_mode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Loop:</span>
                <span className={`text-xs font-semibold ${displayStatus.loop_mode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {displayStatus.loop_mode ? 'ON' : 'OFF'}
                </span>
              </div>
              {displayStatus.circuit_info && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Qubits:</span>
                  <span className="text-gray-900 dark:text-gray-100 text-xs">
                    {displayStatus.circuit_info.num_qubits}
                  </span>
                </div>
              )}
              {displayStatus.control_system && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Command:</span>
                  <span className="text-gray-900 dark:text-gray-100 text-xs">
                    {displayStatus.control_system.command}
                  </span>
                </div>
              )}
              {displayStatus.last_result_time && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Result Time:</span>
                  <span className="text-gray-900 dark:text-gray-100 text-xs">
                    {new Date(displayStatus.last_result_time).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Last Execution */}
          {control.last_execution && (
            <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Last Execution
              </p>
              <div className="space-y-1 text-xs">
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-mono">ID:</span> {control.last_execution.job_id.substring(0, 8)}...
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-mono">Status:</span> {control.last_execution.status}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-mono">Time:</span> {new Date(control.last_execution.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <p className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Control-based execution via API proxy
          </p>
        </div>
      </div>
    </CardWrapper>
  )
}