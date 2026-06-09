import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { HistogramData } from '../../../../hooks/useResultHistogram'

const mockUseResultHistogram = vi.fn()
vi.mock('../../../../hooks/useResultHistogram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../hooks/useResultHistogram')>()
  return {
    ...actual,
    useResultHistogram: (...args: Parameters<typeof actual.useResultHistogram>) =>
      mockUseResultHistogram(...args),
  }
})

const mockUseAuth = vi.fn()
vi.mock('../../../../lib/auth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../../../charts/LazyEChart', () => ({
  LazyEChart: ({ option }: { option: unknown }) => (
    <div data-testid="lazy-echart" data-has-option={option ? 'true' : 'false'} />
  ),
}))

import { CardDataReportContext } from '../../CardDataContext'
import { QuantumHistogramCard } from '../QuantumHistogramCard'

const DEMO_HISTOGRAM: HistogramData = {
  histogram: [
    { pattern: '00', count: 496, probability: 0.4844 },
    { pattern: '11', count: 372, probability: 0.3633 },
  ],
  sort: 'pattern',
  num_patterns: 4,
  total_shots: 868,
  num_qubits: 2,
  timestamp: '2026-05-08T14:00:00Z',
  backend: 'ibmq_qasm_simulator',
  backend_type: 'simulator',
  execution_sequence: 7,
}

const EMPTY_HISTOGRAM: HistogramData = {
  histogram: [],
  sort: 'pattern',
  num_patterns: 0,
  total_shots: 0,
  num_qubits: null,
  timestamp: null,
  backend: null,
  backend_type: null,
  execution_sequence: null,
}

function defaultAuthReturn(overrides: Record<string, unknown> = {}) {
  return {
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    ...overrides,
  }
}

function defaultHookReturn(
  overrides: Partial<{
    data: HistogramData | null
    isLoading: boolean
    isRefreshing: boolean
    isDemoData: boolean
    error: string | null
    isFailed: boolean
    consecutiveFailures: number
    lastRefresh: number | null
    refetch: () => Promise<void>
  }> = {},
) {
  return {
    data: DEMO_HISTOGRAM,
    isLoading: false,
    isRefreshing: false,
    isDemoData: false,
    error: null,
    isFailed: false,
    consecutiveFailures: 0,
    lastRefresh: Date.now(),
    refetch: vi.fn(),
    ...overrides,
  }
}

describe('QuantumHistogramCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(defaultAuthReturn())
    mockUseResultHistogram.mockReturnValue(defaultHookReturn())
  })

  it('renders loading skeleton while auth is loading', () => {
    mockUseAuth.mockReturnValue(defaultAuthReturn({ isLoading: true, isAuthenticated: false }))

    const { container } = render(<QuantumHistogramCard />)

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('lazy-echart')).toBeNull()
  })

  it('renders loading skeleton when histogram hook is loading and has no data', () => {
    mockUseResultHistogram.mockReturnValue(
      defaultHookReturn({ isLoading: true, data: null }),
    )

    const { container } = render(<QuantumHistogramCard />)

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('lazy-echart')).toBeNull()
  })

  it('renders login prompt when user is not authenticated', () => {
    const login = vi.fn()
    mockUseAuth.mockReturnValue(defaultAuthReturn({ isAuthenticated: false, login }))

    render(<QuantumHistogramCard />)

    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
    expect(screen.queryByTestId('lazy-echart')).toBeNull()
  })

  it('renders empty state when histogram has no entries', () => {
    mockUseResultHistogram.mockReturnValue(
      defaultHookReturn({ data: EMPTY_HISTOGRAM }),
    )

    render(<QuantumHistogramCard />)

    // Empty hint copy uses i18n keys; jest-dom mock returns the key string.
    expect(screen.getByText(/quantumHistogram\.emptyTitle/)).toBeInTheDocument()
    expect(screen.queryByTestId('lazy-echart')).toBeNull()
  })

  it('renders chart and metadata when histogram has data', () => {
    render(<QuantumHistogramCard />)

    expect(screen.getByTestId('lazy-echart')).toBeInTheDocument()
    // Metadata tiles render the numeric values from the hook payload.
    expect(screen.getByText('4')).toBeInTheDocument() // num_patterns
    expect(screen.getByText('868')).toBeInTheDocument() // total_shots
    expect(screen.getByText('2')).toBeInTheDocument() // num_qubits
  })

  it('renders error banner when error string is set after data loads', () => {
    mockUseResultHistogram.mockReturnValue(
      defaultHookReturn({
        data: DEMO_HISTOGRAM,
        error: 'fetch failed',
      }),
    )

    render(<QuantumHistogramCard />)

    expect(screen.getByText('fetch failed')).toBeInTheDocument()
  })

  it('reports isDemoData: true to CardDataReportContext when hook returns isDemoData true', async () => {
    const report = vi.fn()
    mockUseResultHistogram.mockReturnValue(
      defaultHookReturn({ isDemoData: true, data: DEMO_HISTOGRAM }),
    )

    render(
      <CardDataReportContext.Provider value={{ report }}>
        <QuantumHistogramCard />
      </CardDataReportContext.Provider>,
    )

    await waitFor(() => {
      const reportedDemo = report.mock.calls.some(
        (call) =>
          call[0] &&
          typeof call[0] === 'object' &&
          (call[0] as { isDemoData?: boolean }).isDemoData === true,
      )
      expect(reportedDemo).toBe(true)
    })
  })

  it('does not crash when data fields are missing (array safety)', () => {
    mockUseResultHistogram.mockReturnValue(
      defaultHookReturn({
        data: {
          ...EMPTY_HISTOGRAM,
          // Simulate a partial response: histogram entries exist but metadata
          // fields default to 0 / em-dash.
          histogram: [{ pattern: '00', count: 1, probability: 1 }],
          num_patterns: 1,
          total_shots: 1,
        },
      }),
    )

    render(<QuantumHistogramCard />)

    expect(screen.getByTestId('lazy-echart')).toBeInTheDocument()
  })
})
