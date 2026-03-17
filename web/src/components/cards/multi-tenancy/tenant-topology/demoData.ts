/**
 * Demo data for the Tenant Topology card.
 *
 * In demo mode all components are shown as detected and healthy,
 * giving the user a complete picture of what the architecture looks like
 * when fully deployed.  Throughput rates use the same demo values as
 * useNetworkStats to ensure animated connections look realistic.
 */

import type { TenantTopologyData } from './useTenantTopology'

/** Demo KubeVirt eth0 combined throughput — 15 KB/s (10 rx + 5 tx) */
const DEMO_KV_ETH0_RATE = 15360
/** Demo KubeVirt eth1 combined throughput — 3.8 KB/s (2.5 rx + 1.3 tx) */
const DEMO_KV_ETH1_RATE = 3840
/** Demo K3s eth0 combined throughput — 7.5 KB/s (5 rx + 2.5 tx) */
const DEMO_K3S_ETH0_RATE = 7680
/** Demo K3s eth1 combined throughput — 1.9 KB/s (1.3 rx + 0.6 tx) */
const DEMO_K3S_ETH1_RATE = 1920

export const DEMO_TENANT_TOPOLOGY: TenantTopologyData = {
  ovnDetected: true,
  ovnHealthy: true,
  kubeflexDetected: true,
  kubeflexHealthy: true,
  k3sDetected: false,
  k3sHealthy: false,
  kubevirtDetected: false,
  kubevirtHealthy: false,
  kvEth0Rate: 0,
  kvEth1Rate: 0,
  k3sEth0Rate: 0,
  k3sEth1Rate: 0,
  isLoading: false,
  isDemoData: true,
}
