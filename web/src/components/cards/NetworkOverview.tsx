import { useMemo } from 'react'
import { Network, Globe, Server, Layers, ExternalLink } from 'lucide-react'
import { useClusters, useServices } from '../../hooks/useMCP'
import { useGlobalFilters } from '../../hooks/useGlobalFilters'
import { RefreshIndicator } from '../ui/RefreshIndicator'

export function NetworkOverview() {
  const { clusters, isLoading, isRefreshing, lastUpdated } = useClusters()
  const { services, isLoading: servicesLoading } = useServices()
  const { selectedClusters, isAllClustersSelected } = useGlobalFilters()

  // Filter clusters by selection
  const filteredClusters = useMemo(() => {
    if (isAllClustersSelected) return clusters
    return clusters.filter(c => selectedClusters.includes(c.name))
  }, [clusters, selectedClusters, isAllClustersSelected])

  // Filter services by selection
  const filteredServices = useMemo(() => {
    if (isAllClustersSelected) return services
    return services.filter(s => s.cluster && selectedClusters.includes(s.cluster))
  }, [services, selectedClusters, isAllClustersSelected])

  // Calculate network stats
  const stats = useMemo(() => {
    const totalServices = filteredServices.length
    const loadBalancers = filteredServices.filter(s => s.type === 'LoadBalancer').length
    const nodePort = filteredServices.filter(s => s.type === 'NodePort').length
    const clusterIP = filteredServices.filter(s => s.type === 'ClusterIP').length
    const externalName = filteredServices.filter(s => s.type === 'ExternalName').length

    // Group by namespace
    const namespaces = new Map<string, number>()
    filteredServices.forEach(s => {
      const ns = s.namespace || 'default'
      namespaces.set(ns, (namespaces.get(ns) || 0) + 1)
    })

    return {
      totalServices,
      loadBalancers,
      nodePort,
      clusterIP,
      externalName,
      namespaces: Array.from(namespaces.entries()).sort((a, b) => b[1] - a[1]),
      clustersWithServices: new Set(filteredServices.map(s => s.cluster)).size,
    }
  }, [filteredServices])

  const hasRealData = !isLoading && filteredClusters.length > 0

  if (isLoading && !clusters.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading network data...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-foreground">Network Overview</span>
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

      {/* Main stat */}
      <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-cyan-400">Total Services</span>
        </div>
        <span className="text-2xl font-bold text-foreground">{stats.totalServices}</span>
        <div className="text-xs text-muted-foreground mt-1">
          across {stats.clustersWithServices} cluster{stats.clustersWithServices !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Service Types */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Globe className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-400">LoadBalancer</span>
          </div>
          <span className="text-lg font-bold text-foreground">{stats.loadBalancers}</span>
        </div>
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Server className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-purple-400">NodePort</span>
          </div>
          <span className="text-lg font-bold text-foreground">{stats.nodePort}</span>
        </div>
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Server className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">ClusterIP</span>
          </div>
          <span className="text-lg font-bold text-foreground">{stats.clusterIP}</span>
        </div>
        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <ExternalLink className="w-3 h-3 text-orange-400" />
            <span className="text-xs text-orange-400">ExternalName</span>
          </div>
          <span className="text-lg font-bold text-foreground">{stats.externalName}</span>
        </div>
      </div>

      {/* Top Namespaces */}
      {stats.namespaces.length > 0 && (
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-2">Top Namespaces</div>
          <div className="space-y-1.5">
            {stats.namespaces.slice(0, 5).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                <span className="text-sm text-foreground truncate">{name}</span>
                <span className="text-xs text-muted-foreground">{count} services</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
        {servicesLoading ? 'Loading service data...' : `${stats.totalServices} services across ${filteredClusters.length} clusters`}
      </div>
    </div>
  )
}
