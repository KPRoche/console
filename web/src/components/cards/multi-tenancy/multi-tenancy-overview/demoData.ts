/**
 * Demo data for the Multi-Tenancy Overview card.
 *
 * Shows a mixed state: OVN and KubeFlex detected, K3s and KubeVirt missing.
 * This gives visitors a realistic view of both installed and not-installed states.
 */
import type { MultiTenancyOverviewData } from './useMultiTenancyOverview'

/** Number of demo tenants (from KubeFlex control planes) */
const DEMO_TENANT_COUNT = 0
/** Only network isolation is ready in demo (OVN detected) */
const DEMO_ISOLATION_SCORE = 1
/** Total isolation levels in the architecture */
const DEMO_TOTAL_LEVELS = 3

export const DEMO_MULTI_TENANCY_OVERVIEW: MultiTenancyOverviewData = {
  components: [
    { name: 'OVN-K8s', detected: true, health: 'healthy', icon: 'network' },
    { name: 'KubeFlex', detected: true, health: 'healthy', icon: 'layers' },
    { name: 'K3s', detected: false, health: 'not-installed', icon: 'box' },
    { name: 'KubeVirt', detected: false, health: 'not-installed', icon: 'monitor' },
  ],
  isolationLevels: [
    { type: 'Control-plane', status: 'missing', provider: 'KubeFlex + K3s' },
    { type: 'Data-plane', status: 'missing', provider: 'KubeVirt' },
    { type: 'Network', status: 'ready', provider: 'OVN-Kubernetes' },
  ],
  tenantCount: DEMO_TENANT_COUNT,
  overallScore: DEMO_ISOLATION_SCORE,
  totalLevels: DEMO_TOTAL_LEVELS,
  isLoading: false,
  isDemoData: true,
}
