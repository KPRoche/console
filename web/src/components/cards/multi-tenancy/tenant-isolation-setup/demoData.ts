/**
 * Demo data for the Tenant Isolation Setup card.
 *
 * Mixed state: OVN and KubeFlex detected, K3s and KubeVirt not installed.
 * Shows both the "detected" state and the "Install with AI Agent" CTA.
 */
import type { TenantIsolationSetupData } from './useTenantIsolationSetup'

/** Number of total components in the multi-tenancy stack */
const DEMO_COMPONENT_COUNT = 4
/** Number of components ready in demo */
const DEMO_READY_COUNT = 2
/** Only network isolation ready in demo (OVN detected) */
const DEMO_ISOLATION_SCORE = 1
/** Total isolation levels */
const DEMO_TOTAL_LEVELS = 3

export const DEMO_TENANT_ISOLATION_SETUP: TenantIsolationSetupData = {
  components: [
    { name: 'OVN-Kubernetes', key: 'ovn', detected: true, health: 'healthy' },
    { name: 'KubeFlex', key: 'kubeflex', detected: true, health: 'healthy' },
    { name: 'K3s', key: 'k3s', detected: false, health: 'not-installed' },
    { name: 'KubeVirt', key: 'kubevirt', detected: false, health: 'not-installed' },
  ],
  isolationLevels: [
    { type: 'Control-plane', status: 'missing', provider: 'KubeFlex + K3s' },
    { type: 'Data-plane', status: 'missing', provider: 'KubeVirt' },
    { type: 'Network', status: 'ready', provider: 'OVN-Kubernetes' },
  ],
  allReady: false,
  readyCount: DEMO_READY_COUNT,
  totalComponents: DEMO_COMPONENT_COUNT,
  isolationScore: DEMO_ISOLATION_SCORE,
  totalIsolationLevels: DEMO_TOTAL_LEVELS,
  isLoading: false,
  isDemoData: true,
}
