import { useDroppable } from '@dnd-kit/core'
import { Server, Check, Crown, Cpu, HardDrive, Layers } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ClusterBadge } from '../ui/ClusterBadge'

// Types for cluster capabilities
interface ClusterCapability {
  cluster: string
  nodeCount: number
  cpuCapacity: string
  memCapacity: string
  gpuType?: string
  gpuCount?: number
  available: boolean
  isControlCluster?: boolean
}

// Demo cluster data
const DEMO_CLUSTERS: ClusterCapability[] = [
  {
    cluster: 'us-east-1',
    nodeCount: 5,
    cpuCapacity: '40 cores',
    memCapacity: '160Gi',
    available: true,
  },
  {
    cluster: 'us-west-2',
    nodeCount: 4,
    cpuCapacity: '32 cores',
    memCapacity: '128Gi',
    available: true,
  },
  {
    cluster: 'eu-central-1',
    nodeCount: 3,
    cpuCapacity: '24 cores',
    memCapacity: '96Gi',
    available: true,
  },
  {
    cluster: 'gpu-cluster-1',
    nodeCount: 2,
    cpuCapacity: '16 cores',
    memCapacity: '64Gi',
    gpuType: 'NVIDIA A100',
    gpuCount: 8,
    available: true,
  },
  {
    cluster: 'ks-control',
    nodeCount: 1,
    cpuCapacity: '4 cores',
    memCapacity: '16Gi',
    available: true,
    isControlCluster: true,
  },
]

interface ClusterDropZoneProps {
  isDragging: boolean
  draggedWorkload?: {
    name: string
    namespace: string
    type: string
    currentClusters: string[]
  } | null
  clusters?: ClusterCapability[]
  onDeploy?: (workload: { name: string; namespace: string }, cluster: string) => void
}

export function ClusterDropZone({
  isDragging,
  draggedWorkload,
  clusters = DEMO_CLUSTERS,
  onDeploy,
}: ClusterDropZoneProps) {
  if (!isDragging || !draggedWorkload) return null

  // Filter out clusters where workload is already deployed
  const availableClusters = clusters.filter(
    (c) => !draggedWorkload.currentClusters.includes(c.cluster) && !c.isControlCluster
  )

  return (
    <div className="fixed right-6 top-24 z-50 animate-fade-in-up">
      <div className="glass rounded-xl border border-border/50 p-4 w-72 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-5 h-5 text-blue-500" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Deploy Workload</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {draggedWorkload.name} ({draggedWorkload.type})
            </div>
          </div>
        </div>

        {availableClusters.length === 0 ? (
          <div className="text-center py-4">
            <Layers className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already deployed to all available clusters
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableClusters.map((cluster) => (
              <DroppableCluster
                key={cluster.cluster}
                cluster={cluster}
                workload={draggedWorkload}
                onDeploy={onDeploy}
              />
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Drop workload on a cluster to deploy
          </p>
        </div>
      </div>
    </div>
  )
}

interface DroppableClusterProps {
  cluster: ClusterCapability
  workload: {
    name: string
    namespace: string
    type: string
  }
  onDeploy?: (workload: { name: string; namespace: string }, cluster: string) => void
}

function DroppableCluster({ cluster, workload, onDeploy }: DroppableClusterProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cluster-drop-${cluster.cluster}`,
    data: {
      type: 'cluster',
      cluster: cluster.cluster,
      workload: workload,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-start gap-3 px-3 py-3 rounded-lg border transition-all cursor-pointer',
        isOver
          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 scale-[1.02] shadow-lg'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
      )}
      onClick={() => onDeploy?.(workload, cluster.cluster)}
    >
      <div className="flex-shrink-0 mt-0.5">
        {cluster.isControlCluster ? (
          <Crown className={cn('w-5 h-5', isOver ? 'text-purple-500' : 'text-purple-400')} />
        ) : (
          <Server className={cn('w-5 h-5', isOver ? 'text-blue-500' : 'text-blue-400')} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <ClusterBadge cluster={cluster.cluster} size="sm" />
          {isOver && <Check className="w-4 h-4 text-green-500" />}
        </div>

        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Server className="w-3 h-3" />
            {cluster.nodeCount} nodes
          </div>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            {cluster.cpuCapacity}
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {cluster.memCapacity}
          </div>
          {cluster.gpuType && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Layers className="w-3 h-3" />
              {cluster.gpuCount} GPU
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export type { ClusterCapability }
