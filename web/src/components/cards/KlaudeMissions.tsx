import { Bot, Stethoscope, FileSearch, AlertCircle, Play, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { useMissions } from '../../hooks/useMissions'
import { useClusters, usePodIssues, useDeploymentIssues } from '../../hooks/useMCP'
import { cn } from '../../lib/cn'

// Klaude Mission Cards - Quick actions for AI-powered cluster management

interface KlaudeMissionCardProps {
  config?: Record<string, unknown>
}

// Card 1: Klaude Issues Overview - Shows issues Klaude can help fix
export function KlaudeIssuesCard(_props: KlaudeMissionCardProps) {
  const { startMission, missions } = useMissions()
  useClusters() // Keep hook active for real-time updates
  const { issues: podIssues } = usePodIssues()
  const { issues: deploymentIssues } = useDeploymentIssues()

  const totalIssues = podIssues.length + deploymentIssues.length
  const clustersWithIssues = new Set([
    ...podIssues.map(p => p.cluster),
    ...deploymentIssues.map(d => d.cluster),
  ]).size

  // Check if there's already a running repair mission
  const runningRepairMission = missions.find(m => m.type === 'repair' && m.status === 'running')

  const handleStartRepair = () => {
    const issuesSummary = [
      ...podIssues.slice(0, 5).map(p => `- Pod ${p.name} (${p.namespace}): ${p.status}`),
      ...deploymentIssues.slice(0, 5).map(d => `- Deployment ${d.name} (${d.namespace}): ${d.readyReplicas}/${d.replicas} ready`),
    ].join('\n')

    startMission({
      title: 'Fix Cluster Issues',
      description: `Repairing ${totalIssues} issues across ${clustersWithIssues} clusters`,
      type: 'repair',
      initialPrompt: `I need help diagnosing and fixing issues across my Kubernetes clusters.

Current issues (${totalIssues} total across ${clustersWithIssues} clusters):
${issuesSummary}
${totalIssues > 10 ? `\n...and ${totalIssues - 10} more issues` : ''}

Please:
1. Analyze these issues and identify root causes
2. Prioritize by severity
3. Provide step-by-step remediation commands
4. Explain potential side effects of each fix`,
      context: {
        podIssues: podIssues.slice(0, 20),
        deploymentIssues: deploymentIssues.slice(0, 20),
        clustersWithIssues,
      },
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-medium text-muted-foreground">Klaude Issues</span>
        </div>
        {runningRepairMission && (
          <span className="flex items-center gap-1 text-xs text-purple-400">
            <Clock className="w-3 h-3 animate-pulse" />
            Fixing...
          </span>
        )}
      </div>

      {/* Issue Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <div className="text-2xl font-bold text-foreground">{podIssues.length}</div>
          <div className="text-xs text-orange-400">Pod Issues</div>
        </div>
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="text-2xl font-bold text-foreground">{deploymentIssues.length}</div>
          <div className="text-xs text-yellow-400">Deployment Issues</div>
        </div>
      </div>

      {/* Top Issues Preview */}
      <div className="flex-1 space-y-2 overflow-y-auto mb-4">
        {podIssues.slice(0, 3).map((issue, i) => (
          <div key={`pod-${i}`} className="p-2 rounded bg-orange-500/10 text-xs">
            <div className="font-medium text-foreground truncate">{issue.name}</div>
            <div className="text-orange-400">{issue.status}</div>
          </div>
        ))}
        {totalIssues > 3 && (
          <div className="text-xs text-muted-foreground text-center">
            +{totalIssues - 3} more issues
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={handleStartRepair}
        disabled={totalIssues === 0 || !!runningRepairMission}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all',
          totalIssues === 0
            ? 'bg-green-500/20 text-green-400 cursor-default'
            : runningRepairMission
              ? 'bg-purple-500/20 text-purple-400 cursor-wait'
              : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
        )}
      >
        {totalIssues === 0 ? (
          <>
            <CheckCircle className="w-4 h-4" />
            All Clear
          </>
        ) : runningRepairMission ? (
          <>
            <Clock className="w-4 h-4 animate-pulse" />
            Repair in Progress
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Ask Klaude to Fix
          </>
        )}
      </button>
    </div>
  )
}

// Card 2: Kubeconfig Audit - Detect stale/unreachable clusters
export function KlaudeKubeconfigAuditCard(_props: KlaudeMissionCardProps) {
  const { startMission, missions } = useMissions()
  const { clusters, isLoading, refetch } = useClusters()

  const unreachableClusters = clusters.filter(c => c.reachable === false || c.nodeCount === 0)

  const runningAuditMission = missions.find(m => m.title.includes('Kubeconfig') && m.status === 'running')

  const handleStartAudit = () => {
    startMission({
      title: 'Kubeconfig Audit',
      description: 'Analyzing kubeconfig for stale or problematic clusters',
      type: 'analyze',
      initialPrompt: `Please audit my kubeconfig and help me clean it up.

Current clusters (${clusters.length} total):
${clusters.map(c => `- ${c.name}: ${c.reachable === false ? 'UNREACHABLE' : c.healthy ? 'healthy' : 'unhealthy'} (${c.nodeCount || 0} nodes)`).join('\n')}

Unreachable clusters (${unreachableClusters.length}):
${unreachableClusters.map(c => `- ${c.name}: ${c.errorMessage || 'Connection failed'}`).join('\n') || 'None'}

Please:
1. Identify clusters that should be removed from kubeconfig
2. Check for duplicate or redundant contexts
3. Verify cluster naming conventions
4. Suggest cleanup commands (kubectl config delete-context, etc.)
5. Identify any security concerns (old credentials, etc.)`,
      context: {
        clusters: clusters.map(c => ({
          name: c.name,
          reachable: c.reachable,
          healthy: c.healthy,
          nodeCount: c.nodeCount,
          errorMessage: c.errorMessage,
        })),
      },
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-medium text-muted-foreground">Kubeconfig Audit</span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 hover:bg-secondary rounded transition-colors"
          title="Refresh cluster status"
        >
          <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Audit Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <div className="text-2xl font-bold text-foreground">{clusters.length}</div>
          <div className="text-xs text-cyan-400">Total Contexts</div>
        </div>
        <div className={cn(
          'p-3 rounded-lg border',
          unreachableClusters.length > 0
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-green-500/10 border-green-500/20'
        )}>
          <div className="text-2xl font-bold text-foreground">{unreachableClusters.length}</div>
          <div className={cn('text-xs', unreachableClusters.length > 0 ? 'text-yellow-400' : 'text-green-400')}>
            Unreachable
          </div>
        </div>
      </div>

      {/* Unreachable Clusters Preview */}
      <div className="flex-1 space-y-2 overflow-y-auto mb-4">
        {unreachableClusters.slice(0, 3).map((cluster, i) => (
          <div key={i} className="p-2 rounded bg-yellow-500/10 text-xs">
            <div className="font-medium text-foreground truncate">{cluster.name}</div>
            <div className="text-yellow-400 truncate">{cluster.errorMessage || 'Connection failed'}</div>
          </div>
        ))}
        {unreachableClusters.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
            All clusters reachable
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={handleStartAudit}
        disabled={!!runningAuditMission}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all',
          runningAuditMission
            ? 'bg-cyan-500/20 text-cyan-400 cursor-wait'
            : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'
        )}
      >
        {runningAuditMission ? (
          <>
            <Clock className="w-4 h-4 animate-pulse" />
            Auditing...
          </>
        ) : (
          <>
            <Stethoscope className="w-4 h-4" />
            Run Audit
          </>
        )}
      </button>
    </div>
  )
}

// Card 3: Cluster Health Check - Overall health assessment
export function KlaudeHealthCheckCard(_props: KlaudeMissionCardProps) {
  const { startMission, missions } = useMissions()
  const { clusters, isLoading, refetch } = useClusters()
  const { issues: podIssues } = usePodIssues()
  const { issues: deploymentIssues } = useDeploymentIssues()

  const healthyClusters = clusters.filter(c => c.healthy && c.reachable !== false).length
  const unhealthyClusters = clusters.filter(c => !c.healthy && c.reachable !== false).length
  const unreachableClusters = clusters.filter(c => c.reachable === false).length

  const totalNodes = clusters.reduce((sum, c) => sum + (c.nodeCount || 0), 0)
  const totalPods = clusters.reduce((sum, c) => sum + (c.podCount || 0), 0)
  const totalIssues = podIssues.length + deploymentIssues.length

  const runningHealthMission = missions.find(m => m.type === 'troubleshoot' && m.status === 'running')

  const handleStartHealthCheck = () => {
    startMission({
      title: 'Cluster Health Check',
      description: 'Comprehensive health analysis across all clusters',
      type: 'troubleshoot',
      initialPrompt: `Please perform a comprehensive health check of my Kubernetes infrastructure.

Cluster Overview:
- Total clusters: ${clusters.length}
- Healthy: ${healthyClusters}
- Unhealthy: ${unhealthyClusters}
- Unreachable: ${unreachableClusters}

Resource Summary:
- Total nodes: ${totalNodes}
- Total pods: ${totalPods}
- Known issues: ${totalIssues}

Clusters by status:
${clusters.map(c => `- ${c.name}: ${c.healthy ? '✓ healthy' : c.reachable === false ? '✗ unreachable' : '⚠ unhealthy'} (${c.nodeCount || 0} nodes, ${c.podCount || 0} pods)`).join('\n')}

Please provide:
1. Overall infrastructure health score (1-10)
2. Critical issues requiring immediate attention
3. Resource utilization analysis
4. Recommendations for improving reliability
5. Cost optimization opportunities
6. Security posture assessment`,
      context: {
        clusters: clusters.map(c => ({
          name: c.name,
          healthy: c.healthy,
          reachable: c.reachable,
          nodeCount: c.nodeCount,
          podCount: c.podCount,
          cpuCores: c.cpuCores,
          memoryGB: c.memoryGB,
        })),
        totalIssues,
      },
    })
  }

  // Calculate health score (0-100)
  const healthScore = clusters.length > 0
    ? Math.round((healthyClusters / clusters.length) * 100)
    : 0

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium text-muted-foreground">Health Check</span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 hover:bg-secondary rounded transition-colors"
          title="Refresh cluster status"
        >
          <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Health Score */}
      <div className="flex items-center justify-center mb-4">
        <div className={cn(
          'w-20 h-20 rounded-full border-4 flex items-center justify-center',
          healthScore >= 80 ? 'border-green-500 bg-green-500/10' :
          healthScore >= 60 ? 'border-yellow-500 bg-yellow-500/10' :
          'border-red-500 bg-red-500/10'
        )}>
          <div className="text-center">
            <div className={cn(
              'text-2xl font-bold',
              healthScore >= 80 ? 'text-green-400' :
              healthScore >= 60 ? 'text-yellow-400' :
              'text-red-400'
            )}>{healthScore}%</div>
            <div className="text-[10px] text-muted-foreground">Health</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="p-2 rounded bg-green-500/10">
          <div className="text-lg font-bold text-green-400">{healthyClusters}</div>
          <div className="text-[10px] text-muted-foreground">Healthy</div>
        </div>
        <div className="p-2 rounded bg-orange-500/10">
          <div className="text-lg font-bold text-orange-400">{unhealthyClusters}</div>
          <div className="text-[10px] text-muted-foreground">Unhealthy</div>
        </div>
        <div className="p-2 rounded bg-yellow-500/10">
          <div className="text-lg font-bold text-yellow-400">{unreachableClusters}</div>
          <div className="text-[10px] text-muted-foreground">Unreachable</div>
        </div>
      </div>

      {/* Issues Summary */}
      {totalIssues > 0 && (
        <div className="mb-4 p-2 rounded bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 text-xs text-orange-400">
            <AlertCircle className="w-3 h-3" />
            {totalIssues} issues detected
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleStartHealthCheck}
        disabled={!!runningHealthMission}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all mt-auto',
          runningHealthMission
            ? 'bg-green-500/20 text-green-400 cursor-wait'
            : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
        )}
      >
        {runningHealthMission ? (
          <>
            <Clock className="w-4 h-4 animate-pulse" />
            Analyzing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Full Health Check
          </>
        )}
      </button>
    </div>
  )
}

// Export all Klaude cards
export const KLAUDE_CARDS = {
  klaude_issues: KlaudeIssuesCard,
  klaude_kubeconfig_audit: KlaudeKubeconfigAuditCard,
  klaude_health_check: KlaudeHealthCheckCard,
}
