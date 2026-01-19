import { WifiOff } from 'lucide-react'

export interface ClusterStats {
  total: number
  loading: number
  healthy: number
  unhealthy: number
  unreachable: number
  totalNodes: number
  totalCPUs: number
  totalPods: number
  totalGPUs: number
  allocatedGPUs: number
}

interface StatsOverviewProps {
  stats: ClusterStats
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      <div className="glass p-4 rounded-lg">
        <div className="text-3xl font-bold text-foreground">{stats.total}</div>
        <div className="text-sm text-muted-foreground">Total</div>
      </div>
      <div className="glass p-4 rounded-lg">
        <div className="text-3xl font-bold text-green-400">{stats.healthy}</div>
        <div className="text-sm text-muted-foreground">Healthy</div>
      </div>
      <div className="glass p-4 rounded-lg">
        <div className="text-3xl font-bold text-orange-400">{stats.unhealthy}</div>
        <div className="text-sm text-muted-foreground">Unhealthy</div>
      </div>
      <div className="glass p-4 rounded-lg" title="Unreachable - check network connection">
        <div className="flex items-center gap-1.5">
          <div className="text-3xl font-bold text-yellow-400">{stats.unreachable}</div>
          {stats.unreachable > 0 && <WifiOff className="w-4 h-4 text-yellow-400" />}
        </div>
        <div className="text-sm text-muted-foreground">Unreachable</div>
      </div>
      <div className="glass p-4 rounded-lg">
        <div className="text-3xl font-bold text-foreground">{stats.totalNodes}</div>
        <div className="text-sm text-muted-foreground">Nodes</div>
      </div>
      <div className="glass p-4 rounded-lg">
        <div className="text-3xl font-bold text-foreground">{stats.totalCPUs}</div>
        <div className="text-sm text-muted-foreground">CPUs</div>
      </div>
      <div className="glass p-4 rounded-lg">
        <div className="text-3xl font-bold text-foreground">{stats.totalGPUs}</div>
        <div className="text-sm text-muted-foreground">GPUs</div>
        {stats.allocatedGPUs > 0 && (
          <div className="text-xs text-yellow-400">{stats.allocatedGPUs} allocated</div>
        )}
      </div>
      <div className="glass p-4 rounded-lg">
        <div className="text-3xl font-bold text-foreground">{stats.totalPods}</div>
        <div className="text-sm text-muted-foreground">Pods</div>
      </div>
    </div>
  )
}
