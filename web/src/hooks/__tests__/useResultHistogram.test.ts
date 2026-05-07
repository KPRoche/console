import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useResultHistogram } from '../useResultHistogram'
import * as authModule from '../../lib/auth'

vi.mock('../../lib/auth')

const mockHistogramData = {
  histogram: [
    { pattern: '00', count: 450, probability: 0.45 },
    { pattern: '11', count: 550, probability: 0.55 },
  ],
  sort: 'count',
  num_patterns: 2,
  total_shots: 1000,
  num_qubits: 2,
  timestamp: new Date().toISOString(),
  backend: 'aer_simulator',
  backend_type: 'simulator',
  execution_sequence: 1,
}

describe('useResultHistogram', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null data and isLoading false when not authenticated', async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      user: null,
    } as any)

    const { result } = renderHook(() => useResultHistogram())

    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches histogram data successfully', async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      user: { id: 'user1' },
    } as any)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => mockHistogramData,
      text: async () => '',
    })

    const { result } = renderHook(() => useResultHistogram('count', 5000))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockHistogramData)
    expect(result.current.error).toBeNull()
  })

  it('silently handles 429 rate limit without reporting error', async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      user: { id: 'user1' },
    } as any)

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Map([['content-type', 'application/json']]),
      text: async () => 'Too Many Requests',
    })

    const { result } = renderHook(() => useResultHistogram())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.data).toBeNull()
  })

  it('silently handles HTML response (backend loading)', async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      user: { id: 'user1' },
    } as any)

    global.fetch = vi.fn().mockRejectedValue(
      new Error("<!doctype html><html>Loading</html>")
    )

    const { result } = renderHook(() => useResultHistogram())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
  })

  it('reports error for non-ok HTTP responses (excluding 429)', async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      user: { id: 'user1' },
    } as any)

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Map([['content-type', 'application/json']]),
      text: async () => 'Internal Server Error',
    })

    const { result } = renderHook(() => useResultHistogram())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toContain('Failed to fetch histogram (500)')
  })

  it('sets data to null when warning is present', async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      user: { id: 'user1' },
    } as any)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({
        ...mockHistogramData,
        warning: 'No execution yet',
      }),
      text: async () => '',
    })

    const { result } = renderHook(() => useResultHistogram())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeNull()
  })

  it('polls at specified interval', async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      user: { id: 'user1' },
    } as any)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => mockHistogramData,
      text: async () => '',
    })

    const { result } = renderHook(() => useResultHistogram('count', 5000))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    vi.advanceTimersByTime(5000)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  it('includes sortBy in query parameters', async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      user: { id: 'user1' },
    } as any)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => mockHistogramData,
      text: async () => '',
    })

    renderHook(() => useResultHistogram('pattern', 5000))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=pattern'),
        expect.any(Object)
      )
    })
  })
})
