import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocalAgent } from '../../../hooks/useLocalAgent'
import { useDrillDownActions } from '../../../hooks/useDrillDown'
import { useCanI } from '../../../hooks/usePermissions'
import { ClusterBadge } from '../../ui/ClusterBadge'
import { FileText, Code, Info, Tag, Zap, Loader2, Copy, Check, Layers, Server, Box, Minus, Plus } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { StatusIndicator } from '../../charts/StatusIndicator'
import { Gauge } from '../../charts/Gauge'

interface Props {
  data: Record<string, unknown>
}

type TabType = 'overview' | 'pods' | 'events' | 'describe' | 'yaml'

export function DeploymentDrillDown({ data }: Props) {
  const cluster = data.cluster as string
  const namespace = data.namespace as string
  const deploymentName = data.deployment as string
  const { isConnected: agentConnected } = useLocalAgent()
  const { drillToNamespace, drillToCluster, drillToPod, drillToReplicaSet } = useDrillDownActions()

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [replicas, setReplicas] = useState<number>((data.replicas as number) || 0)
  const [readyReplicas, setReadyReplicas] = useState<number>((data.readyReplicas as number) || 0)
  const [pods, setPods] = useState<Array<{ name: string; status: string; restarts: number }>>([])
  const [replicaSets, setReplicaSets] = useState<Array<{ name: string; replicas: number; ready: number }>>([])
  const [labels, setLabels] = useState<Record<string, string> | null>(null)
  const [eventsOutput, setEventsOutput] = useState<string | null>(null)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [describeOutput, setDescribeOutput] = useState<string | null>(null)
  const [describeLoading, setDescribeLoading] = useState(false)
  const [yamlOutput, setYamlOutput] = useState<string | null>(null)
  const [yamlLoading, setYamlLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [canScale, setCanScale] = useState<boolean | null>(null)
  const [desiredReplicas, setDesiredReplicas] = useState<number>((data.replicas as number) || 0)
  const [isScaling, setIsScaling] = useState(false)
  const [scaleError, setScaleError] = useState<string | null>(null)
  const { checkPermission } = useCanI()

  const reason = data.reason as string
  const message = data.message as string

  // Helper to run kubectl commands
  const runKubectl = (args: string[]): Promise<string> => {
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://127.0.0.1:8585/ws')
      const requestId = `kubectl-${Date.now()}-${Math.random().toString(36).slice(2)}`
      let output = ''

      const timeout = setTimeout(() => {
        ws.close()
        resolve(output || '')
      }, 10000)

      ws.onopen = () => {
        ws.send(JSON.stringify({
          id: requestId,
          type: 'kubectl',
          payload: { context: cluster, args }
        }))
      }
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.id === requestId && msg.payload?.output) {
          output = msg.payload.output
        }
        clearTimeout(timeout)
        ws.close()
        resolve(output)
      }
      ws.onerror = () => {
        clearTimeout(timeout)
        ws.close()
        resolve(output || '')
      }
    })
  }

  // Fetch Deployment data
  const fetchData = async () => {
    if (!agentConnected) return

    try {
      const output = await runKubectl(['get', 'deployment', deploymentName, '-n', namespace, '-o', 'json'])
      if (output) {
        const deploy = JSON.parse(output)
        setReplicas(deploy.spec?.replicas || 0)
        setReadyReplicas(deploy.status?.readyReplicas || 0)
        setLabels(deploy.metadata?.labels || {})

        // Get ReplicaSets owned by this Deployment
        const rsOutput = await runKubectl(['get', 'replicasets', '-n', namespace, '-l', `app=${deploymentName}`, '-o', 'json'])
        if (rsOutput) {
          const rsList = JSON.parse(rsOutput)
          const rsInfo = rsList.items?.map((rs: { metadata: { name: string }; spec: { replicas: number }; status: { readyReplicas?: number } }) => ({
            name: rs.metadata.name,
            replicas: rs.spec?.replicas || 0,
            ready: rs.status?.readyReplicas || 0
          })) || []
          setReplicaSets(rsInfo)
        }

        // Get Pods with this deployment's label
        const selector = Object.entries(deploy.spec?.selector?.matchLabels || {})
          .map(([k, v]) => `${k}=${v}`)
          .join(',')
        if (selector) {
          const podsOutput = await runKubectl(['get', 'pods', '-n', namespace, '-l', selector, '-o', 'json'])
          if (podsOutput) {
            const podList = JSON.parse(podsOutput)
            const podInfo = podList.items?.map((p: { metadata: { name: string }; status: { phase: string; containerStatuses?: Array<{ restartCount: number }> } }) => ({
              name: p.metadata.name,
              status: p.status.phase,
              restarts: p.status.containerStatuses?.reduce((sum: number, c: { restartCount: number }) => sum + c.restartCount, 0) || 0
            })) || []
            setPods(podInfo)
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  const fetchEvents = async () => {
    if (!agentConnected || eventsOutput) return
    setEventsLoading(true)
    const output = await runKubectl(['get', 'events', '-n', namespace, '--field-selector', `involvedObject.name=${deploymentName}`, '-o', 'wide'])
    setEventsOutput(output)
    setEventsLoading(false)
  }

  const fetchDescribe = async () => {
    if (!agentConnected || describeOutput) return
    setDescribeLoading(true)
    const output = await runKubectl(['describe', 'deployment', deploymentName, '-n', namespace])
    setDescribeOutput(output)
    setDescribeLoading(false)
  }

  const fetchYaml = async () => {
    if (!agentConnected || yamlOutput) return
    setYamlLoading(true)
    const output = await runKubectl(['get', 'deployment', deploymentName, '-n', namespace, '-o', 'yaml'])
    setYamlOutput(output)
    setYamlLoading(false)
  }

  // Check if user can scale deployments in this namespace
  const checkScalePermission = useCallback(async () => {
    try {
      const result = await checkPermission({
        cluster,
        verb: 'patch',
        resource: 'deployments',
        namespace,
        subresource: 'scale',
      })
      setCanScale(result.allowed)
    } catch {
      // If scale subresource check fails, try checking patch on deployments
      try {
        const result = await checkPermission({
          cluster,
          verb: 'patch',
          resource: 'deployments',
          namespace,
        })
        setCanScale(result.allowed)
      } catch {
        setCanScale(false)
      }
    }
  }, [cluster, namespace, checkPermission])

  // Check scale permission on mount
  useEffect(() => {
    checkScalePermission()
  }, [checkScalePermission])

  // Keep desiredReplicas in sync with replicas when it changes
  useEffect(() => {
    setDesiredReplicas(replicas)
  }, [replicas])

  // Handle scale deployment
  const handleScale = async () => {
    if (!agentConnected || !canScale || desiredReplicas === replicas) return

    setIsScaling(true)
    setScaleError(null)

    try {
      const output = await runKubectl([
        'scale',
        'deployment',
        deploymentName,
        '-n',
        namespace,
        `--replicas=${desiredReplicas}`,
      ])

      if (output.toLowerCase().includes('scaled') || output.toLowerCase().includes('deployment')) {
        // Success - update local state immediately
        setReplicas(desiredReplicas)
        // Refetch data to get updated status
        setTimeout(fetchData, 1000)
      } else if (output.toLowerCase().includes('error') || output.toLowerCase().includes('forbidden')) {
        setScaleError(output || 'Failed to scale deployment')
      }
    } catch (err) {
      setScaleError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsScaling(false)
    }
  }

  // Track if we've already loaded data to prevent refetching
  const hasLoadedRef = useRef(false)

  // Pre-fetch tab data when agent connects
  // Batched to limit concurrent WebSocket connections (max 2 at a time)
  useEffect(() => {
    if (!agentConnected || hasLoadedRef.current) return
    hasLoadedRef.current = true

    const loadData = async () => {
      // Batch 1: Overview data (2 concurrent)
      await Promise.all([
        fetchData(),
        fetchEvents(),
      ])

      // Batch 2: Describe + YAML (2 concurrent, lower priority)
      await Promise.all([
        fetchDescribe(),
        fetchYaml(),
      ])
    }

    loadData()
  }, [agentConnected])

  const handleCopy = (field: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const isHealthy = readyReplicas === replicas && replicas > 0

  const TABS: { id: TabType; label: string; icon: typeof Info }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'pods', label: `Pods (${pods.length})`, icon: Box },
    { id: 'events', label: 'Events', icon: Zap },
    { id: 'describe', label: 'Describe', icon: FileText },
    { id: 'yaml', label: 'YAML', icon: Code },
  ]

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={() => drillToNamespace(cluster, namespace)}
            className="flex items-center gap-2 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30 px-3 py-1.5 rounded-lg transition-all group cursor-pointer"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-muted-foreground">Namespace:</span>
            <span className="font-mono text-purple-400 group-hover:text-purple-300 transition-colors">{namespace}</span>
            <svg className="w-3 h-3 text-purple-400/50 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => drillToCluster(cluster)}
            className="flex items-center gap-2 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 px-3 py-1.5 rounded-lg transition-all group cursor-pointer"
          >
            <Server className="w-4 h-4 text-blue-400" />
            <span className="text-muted-foreground">Cluster:</span>
            <ClusterBadge cluster={cluster.split('/').pop() || cluster} size="sm" />
            <svg className="w-3 h-3 text-blue-400/50 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-6">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status */}
            <div className={`p-4 rounded-lg border ${isHealthy ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusIndicator status={isHealthy ? 'healthy' : 'warning'} size="lg" />
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      {isHealthy ? 'Healthy' : 'Degraded'}
                    </div>
                    {reason && <div className="text-sm text-muted-foreground">{reason}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Gauge value={readyReplicas} max={replicas} size="sm" />
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">{readyReplicas}/{replicas}</div>
                    <div className="text-xs text-muted-foreground">Replicas Ready</div>
                  </div>
                </div>
              </div>
              {message && (
                <div className="mt-3 p-2 rounded bg-card/50 text-sm text-muted-foreground">{message}</div>
              )}
            </div>

            {/* Scale Control */}
            <div className="p-4 rounded-lg bg-card/50 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Scale Deployment
              </h3>
              {scaleError && (
                <div className="mb-3 p-2 rounded bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                  {scaleError}
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDesiredReplicas(Math.max(0, desiredReplicas - 1))}
                    disabled={!canScale || desiredReplicas <= 0 || isScaling}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      canScale && desiredReplicas > 0
                        ? 'bg-secondary hover:bg-secondary/80 text-foreground'
                        : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
                    )}
                    title={canScale === false ? 'No permission to scale' : 'Decrease replicas'}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={desiredReplicas}
                    onChange={(e) => setDesiredReplicas(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                    disabled={!canScale || isScaling}
                    className={cn(
                      'w-16 text-center py-2 rounded-lg bg-secondary border border-border text-foreground font-mono text-lg',
                      (!canScale || isScaling) && 'opacity-50 cursor-not-allowed'
                    )}
                    title={canScale === false ? 'No permission to scale' : 'Desired replicas (0-10)'}
                  />
                  <button
                    onClick={() => setDesiredReplicas(Math.min(10, desiredReplicas + 1))}
                    disabled={!canScale || desiredReplicas >= 10 || isScaling}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      canScale && desiredReplicas < 10
                        ? 'bg-secondary hover:bg-secondary/80 text-foreground'
                        : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
                    )}
                    title={canScale === false ? 'No permission to scale' : 'Increase replicas'}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 text-sm text-muted-foreground">
                  {canScale === null ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Checking permissions...
                    </span>
                  ) : canScale === false ? (
                    <span className="text-yellow-400">No permission to scale deployments</span>
                  ) : desiredReplicas !== replicas ? (
                    <span>Change from {replicas} to {desiredReplicas} replicas</span>
                  ) : (
                    <span>Current: {replicas} replica{replicas !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <button
                  onClick={handleScale}
                  disabled={!canScale || desiredReplicas === replicas || isScaling}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2',
                    canScale && desiredReplicas !== replicas && !isScaling
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {isScaling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scaling...
                    </>
                  ) : (
                    'Scale'
                  )}
                </button>
              </div>
            </div>

            {/* ReplicaSets */}
            {replicaSets.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">ReplicaSets</h3>
                <div className="space-y-2">
                  {replicaSets.map((rs) => (
                    <button
                      key={rs.name}
                      onClick={() => drillToReplicaSet(cluster, namespace, rs.name)}
                      className="w-full p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                        <span className="font-mono text-blue-400">{rs.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{rs.ready}/{rs.replicas} ready</span>
                        <svg className="w-4 h-4 text-blue-400/50 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Labels */}
            {labels && Object.keys(labels).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-400" />
                  Labels
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(labels).slice(0, 8).map(([key, value]) => (
                    <span key={key} className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-mono">
                      {key}={value}
                    </span>
                  ))}
                  {Object.keys(labels).length > 8 && (
                    <span className="text-xs text-muted-foreground">+{Object.keys(labels).length - 8} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pods' && (
          <div className="space-y-3">
            {pods.length > 0 ? (
              pods.map((pod) => (
                <button
                  key={pod.name}
                  onClick={() => drillToPod(cluster, namespace, pod.name, { status: pod.status, restarts: pod.restarts })}
                  className="w-full p-3 rounded-lg bg-card/50 border border-border hover:bg-card/80 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Box className="w-5 h-5 text-cyan-400" />
                    <span className="font-mono text-foreground">{pod.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-xs px-2 py-1 rounded',
                      pod.status === 'Running' ? 'bg-green-500/20 text-green-400' :
                      pod.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {pod.status}
                    </span>
                    {pod.restarts > 0 && (
                      <span className="text-xs text-yellow-400">{pod.restarts} restarts</span>
                    )}
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 rounded-lg bg-card/50 border border-border text-center text-muted-foreground">
                No pods found for this Deployment
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Fetching events...</span>
              </div>
            ) : eventsOutput ? (
              <pre className="p-4 rounded-lg bg-black/50 border border-border overflow-auto max-h-[60vh] text-xs text-foreground font-mono whitespace-pre-wrap">
                {eventsOutput.includes('No resources found') ? 'No events found for this Deployment' : eventsOutput}
              </pre>
            ) : (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-yellow-400">KKC Agent not connected</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'describe' && (
          <div>
            {describeLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Running kubectl describe...</span>
              </div>
            ) : describeOutput ? (
              <div className="relative">
                <button
                  onClick={() => handleCopy('describe', describeOutput)}
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-secondary/50 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {copiedField === 'describe' ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
                <pre className="p-4 rounded-lg bg-black/50 border border-border overflow-auto max-h-[60vh] text-xs text-foreground font-mono whitespace-pre-wrap">
                  {describeOutput}
                </pre>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-yellow-400">KKC Agent not connected</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'yaml' && (
          <div>
            {yamlLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Fetching YAML...</span>
              </div>
            ) : yamlOutput ? (
              <div className="relative">
                <button
                  onClick={() => handleCopy('yaml', yamlOutput)}
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-secondary/50 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {copiedField === 'yaml' ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
                <pre className="p-4 rounded-lg bg-black/50 border border-border overflow-auto max-h-[60vh] text-xs text-foreground font-mono whitespace-pre-wrap">
                  {yamlOutput}
                </pre>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-yellow-400">KKC Agent not connected</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
