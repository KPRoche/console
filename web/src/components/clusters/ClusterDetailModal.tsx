import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertTriangle, WifiOff, Pencil, ChevronRight, ChevronDown, Layers, Server, Network, HardDrive, Box, FolderOpen, Loader2, Cpu, MemoryStick, Database } from 'lucide-react'
import { useClusterHealth, usePodIssues, useDeploymentIssues, useGPUNodes, useNodes, useNamespaceStats, useDeployments } from '../../hooks/useMCP'
import { useDrillDownActions } from '../../hooks/useDrillDown'
import { Gauge } from '../charts/Gauge'
import { NodeListItem } from './NodeListItem'
import { NodeDetailPanel } from './NodeDetailPanel'
import { NamespaceResources } from './components'

interface ClusterDetailModalProps {
  clusterName: string
  onClose: () => void
  onRename?: (clusterName: string) => void
}

export function ClusterDetailModal({ clusterName, onClose, onRename }: ClusterDetailModalProps) {
  const { health, isLoading } = useClusterHealth(clusterName)
  const { issues: podIssues } = usePodIssues(clusterName)
  const { issues: deploymentIssues } = useDeploymentIssues(clusterName)
  const { nodes: gpuNodes } = useGPUNodes(clusterName)
  const { nodes: clusterNodes, isLoading: nodesLoading } = useNodes(clusterName)
  const { stats: namespaceStats, isLoading: nsLoading } = useNamespaceStats(clusterName)
  const { deployments: clusterDeployments } = useDeployments(clusterName)
  const { drillToPod } = useDrillDownActions()
  const [showAllNamespaces, setShowAllNamespaces] = useState(false)
  const [showPodsByNamespace, setShowPodsByNamespace] = useState(false)
  const [showNodeDetails, setShowNodeDetails] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [expandedNamespace, setExpandedNamespace] = useState<string | null>(null)

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const clusterGPUs = gpuNodes.filter(n => n.cluster === clusterName || n.cluster.includes(clusterName.split('/')[0]))
  const clusterDeploymentIssues = deploymentIssues.filter(d => d.cluster === clusterName || d.cluster?.includes(clusterName.split('/')[0]))

  // Determine cluster status
  const isUnreachable = !health?.nodeCount || health.nodeCount === 0
  const isHealthy = !isUnreachable && health?.healthy !== false

  // Group GPUs by type for summary
  const gpuByType = useMemo(() => {
    const map: Record<string, { total: number; allocated: number; nodes: typeof clusterGPUs }> = {}
    clusterGPUs.forEach(node => {
      const type = node.gpuType || 'Unknown'
      if (!map[type]) {
        map[type] = { total: 0, allocated: 0, nodes: [] }
      }
      map[type].total += node.gpuCount
      map[type].allocated += node.gpuAllocated
      map[type].nodes.push(node)
    })
    return map
  }, [clusterGPUs])

  // Show modal immediately with loading state for data - don't block on isLoading
  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div className="fixed top-[5vh] left-1/2 -translate-x-1/2 glass p-6 rounded-lg w-[800px] h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header with status icons */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {isUnreachable ? (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/20 text-yellow-400" title="Unreachable - check network connection">
                <WifiOff className="w-4 h-4" />
              </span>
            ) : isHealthy ? (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/20 text-green-400" title="Healthy">
                <CheckCircle className="w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-500/20 text-orange-400" title="Unhealthy">
                <AlertTriangle className="w-4 h-4" />
              </span>
            )}
            <h2 className="text-xl font-semibold text-foreground">{clusterName.split('/').pop()}</h2>
            {onRename && (
              <button
                onClick={() => onRename(clusterName)}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                title="Rename cluster"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats - Interactive Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => !isUnreachable && !isLoading && setShowNodeDetails(!showNodeDetails)}
            disabled={isUnreachable || isLoading}
            className={`group p-4 rounded-lg bg-card/50 border text-left transition-all duration-200 ${
              !isUnreachable && !isLoading ? 'border-border hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer' : 'border-border cursor-default'
            } ${showNodeDetails ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10' : ''}`}
            title={!isUnreachable && !isLoading ? 'Click to view node details' : undefined}
          >
            {isLoading ? (
              <>
                <div className="h-8 w-12 bg-muted/30 rounded animate-pulse mb-1" />
                <div className="text-sm text-muted-foreground">Nodes</div>
                <div className="h-4 w-16 bg-muted/30 rounded animate-pulse mt-1" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">{!isUnreachable ? (health?.nodeCount || 0) : '-'}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  Nodes
                  {!isUnreachable && <ChevronDown className={`w-4 h-4 transition-transform text-cyan-400 ${showNodeDetails ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} />}
                </div>
                <div className="text-xs text-green-400">{!isUnreachable ? `${health?.readyNodes || 0} ready` : 'unreachable'}</div>
                {!isUnreachable && !showNodeDetails && (
                  <div className="text-[10px] text-muted-foreground/50 mt-2 group-hover:text-cyan-400/70 transition-colors">click to expand</div>
                )}
              </>
            )}
          </button>
          <button
            onClick={() => !isUnreachable && !isLoading && setShowPodsByNamespace(!showPodsByNamespace)}
            disabled={isUnreachable || isLoading}
            className={`group p-4 rounded-lg bg-card/50 border text-left transition-all duration-200 ${
              !isUnreachable && !isLoading ? 'border-border hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer' : 'border-border cursor-default'
            } ${showPodsByNamespace ? 'border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/10' : ''}`}
            title={!isUnreachable && !isLoading ? 'Click to view workloads by namespace' : undefined}
          >
            <div className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
              Workloads
              {!isUnreachable && !isLoading && <ChevronDown className={`w-4 h-4 transition-transform text-indigo-400 ${showPodsByNamespace ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} />}
            </div>
            {isLoading ? (
              <div className="space-y-1.5">
                <div className="h-4 bg-muted/30 rounded animate-pulse" />
                <div className="h-4 bg-muted/30 rounded animate-pulse" />
                <div className="h-4 bg-muted/30 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="space-y-0.5 text-xs">
                  {!isUnreachable ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Namespaces</span>
                        <span className="text-foreground font-medium">{namespaceStats.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deployments</span>
                        <span className="text-foreground font-medium">{clusterDeployments.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pods</span>
                        <span className="text-foreground font-medium">{health?.podCount || 0}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                {!isUnreachable && !showPodsByNamespace && (
                  <div className="text-[10px] text-muted-foreground/50 mt-2 group-hover:text-indigo-400/70 transition-colors">click to expand</div>
                )}
              </>
            )}
          </button>
          <div className={`p-4 rounded-lg bg-card/50 border ${clusterGPUs.length > 0 ? 'border-border' : 'border-border'}`}>
            {isLoading ? (
              <>
                <div className="h-8 w-12 bg-muted/30 rounded animate-pulse mb-1" />
                <div className="text-sm text-muted-foreground">GPUs</div>
                <div className="h-4 w-20 bg-muted/30 rounded animate-pulse mt-1" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">{!isUnreachable ? clusterGPUs.reduce((sum, n) => sum + n.gpuCount, 0) : '-'}</div>
                <div className="text-sm text-muted-foreground">GPUs</div>
                <div className="text-xs text-yellow-400">{!isUnreachable ? `${clusterGPUs.reduce((sum, n) => sum + n.gpuAllocated, 0)} allocated` : ''}</div>
              </>
            )}
          </div>
        </div>

        {/* Resource Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">CPU</span>
            </div>
            {isLoading ? (
              <>
                <div className="h-8 w-16 bg-muted/30 rounded animate-pulse mb-1" />
                <div className="h-4 w-24 bg-muted/30 rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">{!isUnreachable ? (health?.cpuCores || 0) : '-'}</div>
                <div className="text-xs text-muted-foreground">cores allocatable</div>
              </>
            )}
          </div>
          <div className="p-4 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <MemoryStick className="w-4 h-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Memory</span>
            </div>
            {isLoading ? (
              <>
                <div className="h-8 w-20 bg-muted/30 rounded animate-pulse mb-1" />
                <div className="h-4 w-16 bg-muted/30 rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {!isUnreachable ? (health?.memoryGB ? (health.memoryGB >= 1024 ? `${(health.memoryGB / 1024).toFixed(1)} TB` : `${Math.round(health.memoryGB)} GB`) : '0 GB') : '-'}
                </div>
                <div className="text-xs text-muted-foreground">allocatable</div>
              </>
            )}
          </div>
          <div className="p-4 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-muted-foreground">Storage</span>
            </div>
            {isLoading ? (
              <>
                <div className="h-8 w-20 bg-muted/30 rounded animate-pulse mb-1" />
                <div className="h-4 w-16 bg-muted/30 rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {!isUnreachable ? (health?.storageGB ? (health.storageGB >= 1024 ? `${(health.storageGB / 1024).toFixed(1)} TB` : `${Math.round(health.storageGB)} GB`) : '0 GB') : '-'}
                </div>
                <div className="text-xs text-muted-foreground">ephemeral</div>
              </>
            )}
          </div>
        </div>

        {/* Pods by Namespace - Expandable with drill-down */}
        {!isUnreachable && showPodsByNamespace && namespaceStats.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Workloads ({namespaceStats.length} namespaces)
            </h3>
            <div className="rounded-lg bg-card/50 border border-border overflow-hidden">
              <div className="divide-y divide-border/30">
                {(showAllNamespaces ? namespaceStats : namespaceStats.slice(0, 5)).map((ns) => {
                  const isExpanded = expandedNamespace === ns.name
                  return (
                    <div key={ns.name} className="overflow-hidden">
                      <button
                        onClick={() => setExpandedNamespace(isExpanded ? null : ns.name)}
                        className="w-full p-3 flex items-center justify-between hover:bg-card/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-medium"><FolderOpen className="w-3 h-3" />NS</span>
                          <span className="font-mono text-sm text-foreground">{ns.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">{ns.podCount} pods</span>
                          {ns.runningPods > 0 && (
                            <span className="text-green-400">{ns.runningPods} running</span>
                          )}
                          {ns.pendingPods > 0 && (
                            <span className="text-yellow-400">{ns.pendingPods} pending</span>
                          )}
                          {ns.failedPods > 0 && (
                            <span className="text-red-400">{ns.failedPods} failed</span>
                          )}
                        </div>
                      </button>
                      {/* Expanded namespace content - shows all resources with tree/list view */}
                      {isExpanded && (
                        <div className="bg-card/20 border-t border-border/20 px-4 py-2">
                          <NamespaceResources
                            clusterName={clusterName}
                            namespace={ns.name}
                            onClose={onClose}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {namespaceStats.length > 5 && (
                <button
                  onClick={() => setShowAllNamespaces(!showAllNamespaces)}
                  className="w-full p-2 text-sm text-primary hover:bg-card/30 transition-colors border-t border-border/30"
                >
                  {showAllNamespaces ? 'Show less' : `Show all ${namespaceStats.length} namespaces`}
                </button>
              )}
            </div>
            {nsLoading && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading namespace data...
              </div>
            )}
          </div>
        )}

        {/* Issues Section */}
        {(podIssues.length > 0 || clusterDeploymentIssues.length > 0) && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Issues ({podIssues.length + clusterDeploymentIssues.length})
            </h3>
            <div className="space-y-2">
              {podIssues.slice(0, 5).map((issue, i) => (
                <div
                  key={`pod-${i}`}
                  onClick={() => {
                    drillToPod(clusterName, issue.namespace, issue.name, {
                      status: issue.status,
                      restarts: issue.restarts,
                      issues: issue.issues,
                      reason: issue.reason,
                    })
                    onClose()
                  }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium flex-shrink-0">
                        <Box className="w-3 h-3" />Pod
                      </span>
                      <span className="font-medium text-foreground truncate">{issue.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">({issue.namespace})</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">{issue.status}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  {issue.restarts > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground pl-14">{issue.restarts} restarts</div>
                  )}
                </div>
              ))}
              {clusterDeploymentIssues.slice(0, 3).map((issue, i) => (
                <div
                  key={`dep-${i}`}
                  className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 cursor-pointer hover:bg-orange-500/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium flex-shrink-0">
                        <Layers className="w-3 h-3" />Deploy
                      </span>
                      <span className="font-medium text-foreground truncate">{issue.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">({issue.namespace})</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400">
                        {issue.readyReplicas}/{issue.replicas} ready
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  {issue.message && (
                    <div className="mt-1 text-xs text-orange-400 pl-16 truncate">{issue.message}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GPU Section */}
        {clusterGPUs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              GPUs by Type
            </h3>
            <div className="space-y-4">
              {Object.entries(gpuByType).map(([type, info]) => (
                <div key={type} className="rounded-lg bg-card/50 border border-border overflow-hidden">
                  <div className="p-3 border-b border-border/50 bg-purple-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{type}</span>
                        <span className="text-xs text-muted-foreground">({info.nodes.length} node{info.nodes.length !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <Gauge value={info.allocated} max={info.total} size="sm" />
                        </div>
                        <span className="text-sm text-muted-foreground">{info.allocated}/{info.total} allocated</span>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-border/30">
                    {info.nodes.map((node, i) => (
                      <div key={i} className="p-3 flex items-center justify-between hover:bg-card/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <Network className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">{node.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-16">
                            <Gauge value={node.gpuAllocated} max={node.gpuCount} size="sm" />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {node.gpuAllocated}/{node.gpuCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Node Details */}
        {!isUnreachable && showNodeDetails && clusterNodes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Nodes ({clusterNodes.length})
            </h3>
            <div className="space-y-2">
              {clusterNodes.map((node) => {
                const isExpanded = expandedNodes.has(node.name)
                return (
                  <div key={node.name}>
                    <div className={`rounded-lg border overflow-hidden ${isExpanded ? 'border-cyan-500/30' : 'border-border/30'}`}>
                      <NodeListItem
                        node={node}
                        isSelected={isExpanded}
                        onClick={() => {
                          setExpandedNodes(prev => {
                            const next = new Set(prev)
                            if (next.has(node.name)) next.delete(node.name)
                            else next.add(node.name)
                            return next
                          })
                        }}
                      />
                    </div>
                    {/* Inline expanded details */}
                    {isExpanded && (
                      <NodeDetailPanel
                        node={node}
                        clusterName={clusterName}
                        onClose={() => setExpandedNodes(prev => { const next = new Set(prev); next.delete(node.name); return next })}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            {nodesLoading && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading node details...
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
