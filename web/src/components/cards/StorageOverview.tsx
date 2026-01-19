import { useMemo } from 'react'
import { HardDrive, Database, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { useClusters, usePVCs } from '../../hooks/useMCP'
import { useGlobalFilters } from '../../hooks/useGlobalFilters'
import { RefreshIndicator } from '../ui/RefreshIndicator'

// Format bytes to human readable
function formatStorage(gb: number): string {
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(1)} TB`
  }
  return `${Math.round(gb)} GB`
}

export function StorageOverview() {
  const { clusters, isLoading, isRefreshing, lastUpdated } = useClusters()
  const { pvcs, isLoading: pvcsLoading } = usePVCs()
  const { selectedClusters, isAllClustersSelected } = useGlobalFilters()

  // Filter clusters by selection
  const filteredClusters = useMemo(() => {
    if (isAllClustersSelected) return clusters
    return clusters.filter(c => selectedClusters.includes(c.name))
  }, [clusters, selectedClusters, isAllClustersSelected])

  // Filter PVCs by selection
  const filteredPVCs = useMemo(() => {
    if (isAllClustersSelected) return pvcs
    return pvcs.filter(p => p.cluster && selectedClusters.includes(p.cluster))
  }, [pvcs, selectedClusters, isAllClustersSelected])

  // Calculate storage stats
  const stats = useMemo(() => {
    const totalStorageGB = filteredClusters.reduce((sum, c) => sum + (c.storageGB || 0), 0)
    const totalPVCs = filteredPVCs.length
    const boundPVCs = filteredPVCs.filter(p => p.status === 'Bound').length
    const pendingPVCs = filteredPVCs.filter(p => p.status === 'Pending').length
    const failedPVCs = totalPVCs - boundPVCs - pendingPVCs

    // Group by storage class
    const storageClasses = new Map<string, number>()
    filteredPVCs.forEach(p => {
      const sc = p.storageClass || 'default'
      storageClasses.set(sc, (storageClasses.get(sc) || 0) + 1)
    })

    return {
      totalStorageGB,
      totalPVCs,
      boundPVCs,
      pendingPVCs,
      failedPVCs,
      storageClasses: Array.from(storageClasses.entries()).sort((a, b) => b[1] - a[1]),
      clustersWithStorage: filteredClusters.filter(c => (c.storageGB || 0) > 0).length,
    }
  }, [filteredClusters, filteredPVCs])

  const hasRealData = !isLoading && filteredClusters.length > 0 &&
    filteredClusters.some(c => c.storageGB !== undefined)

  if (isLoading && !clusters.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading storage data...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-foreground">Storage Overview</span>
          {hasRealData && (
            <span className="text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
              Live
            </span>
          )}
        </div>
        <RefreshIndicator
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          size="sm"
        />
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-purple-400">Total Capacity</span>
          </div>
          <span className="text-2xl font-bold text-foreground">{formatStorage(stats.totalStorageGB)}</span>
          <div className="text-xs text-muted-foreground mt-1">
            across {stats.clustersWithStorage} cluster{stats.clustersWithStorage !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-400">PVCs</span>
          </div>
          <span className="text-2xl font-bold text-foreground">{stats.totalPVCs}</span>
          <div className="text-xs text-muted-foreground mt-1">
            persistent volume claims
          </div>
        </div>
      </div>

      {/* PVC Status breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">Bound</span>
          </div>
          <span className="text-lg font-bold text-foreground">{stats.boundPVCs}</span>
        </div>
        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-yellow-400">Pending</span>
          </div>
          <span className="text-lg font-bold text-foreground">{stats.pendingPVCs}</span>
        </div>
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-xs text-red-400">Failed</span>
          </div>
          <span className="text-lg font-bold text-foreground">{stats.failedPVCs}</span>
        </div>
      </div>

      {/* Storage Classes */}
      {stats.storageClasses.length > 0 && (
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-2">Storage Classes</div>
          <div className="space-y-1.5">
            {stats.storageClasses.slice(0, 5).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                <span className="text-sm text-foreground truncate">{name}</span>
                <span className="text-xs text-muted-foreground">{count} PVCs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
        {pvcsLoading ? 'Loading PVC data...' : `${stats.totalPVCs} PVCs across ${filteredClusters.length} clusters`}
      </div>
    </div>
  )
}
