/**
 * Demo data for the Tenant Topology card.
 *
 * All components detected and healthy with realistic throughput rates.
 * Animated flow particles show active data transfer on all connections.
 */

import type { TenantTopologyData } from './useTenantTopology'

/** Demo KubeVirt eth0 combined throughput — 15 KB/s data-plane traffic */
const DEMO_KV_ETH0_RATE = 15360
/** Demo KubeVirt eth1 combined throughput — 3.8 KB/s control-plane traffic */
const DEMO_KV_ETH1_RATE = 3840
/** Demo K3s eth0 combined throughput — 7.5 KB/s management traffic */
const DEMO_K3S_ETH0_RATE = 7680
/** Demo K3s eth1 combined throughput — 1.9 KB/s control-plane traffic */
const DEMO_K3S_ETH1_RATE = 1920

export const DEMO_TENANT_TOPOLOGY: TenantTopologyData = {
  ovnDetected: true,
  ovnHealthy: true,
  kubeflexDetected: true,
  kubeflexHealthy: true,
  k3sDetected: true,
  k3sHealthy: true,
  kubevirtDetected: true,
  kubevirtHealthy: true,
  kvEth0Rate: DEMO_KV_ETH0_RATE,
  kvEth1Rate: DEMO_KV_ETH1_RATE,
  k3sEth0Rate: DEMO_K3S_ETH0_RATE,
  k3sEth1Rate: DEMO_K3S_ETH1_RATE,
  isLoading: false,
  isDemoData: true,
}
