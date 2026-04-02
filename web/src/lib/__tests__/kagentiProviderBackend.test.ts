import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock authFetch
vi.mock('../api', () => ({
  authFetch: vi.fn(),
}))

import { authFetch } from '../api'

const mockAuthFetch = vi.mocked(authFetch)

// Import the module under test (need to import after mock setup)
let fetchProviders: typeof import('../kagentiProviderBackend').fetchProviders
let fetchProviderTools: typeof import('../kagentiProviderBackend').fetchProviderTools
let callProviderTool: typeof import('../kagentiProviderBackend').callProviderTool

beforeEach(async () => {
  vi.clearAllMocks()
  const mod = await import('../kagentiProviderBackend')
  fetchProviders = mod.fetchProviders
  fetchProviderTools = mod.fetchProviderTools
  callProviderTool = mod.callProviderTool
})

describe('fetchProviders', () => {
  it('returns providers list', async () => {
    const providers = [
      { name: 'openai', namespace: 'default', status: 'ready' },
    ]
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ providers }),
    } as Response)

    const result = await fetchProviders()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('openai')
  })

  it('returns empty array on HTTP error', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const result = await fetchProviders()
    expect(result).toEqual([])
  })

  it('returns empty array on network error', async () => {
    mockAuthFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await fetchProviders()
    expect(result).toEqual([])
  })

  it('returns empty array when providers field is missing', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response)

    const result = await fetchProviders()
    expect(result).toEqual([])
  })
})

describe('fetchProviderTools', () => {
  it('returns tools for a provider', async () => {
    const tools = [
      { name: 'search', description: 'Search the web' },
    ]
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tools }),
    } as Response)

    const result = await fetchProviderTools('openai', 'default')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('search')
  })

  it('returns empty array on HTTP error', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const result = await fetchProviderTools('missing', 'default')
    expect(result).toEqual([])
  })

  it('returns empty array on network error', async () => {
    mockAuthFetch.mockRejectedValueOnce(new Error('Timeout'))

    const result = await fetchProviderTools('provider', 'ns')
    expect(result).toEqual([])
  })
})

describe('callProviderTool', () => {
  it('calls a provider tool and returns result', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ result: 'tool output' }),
    } as Response)

    const result = await callProviderTool('openai', 'default', 'search', { query: 'kubernetes' })
    expect(result).toEqual({ result: 'tool output' })
  })

  it('throws on HTTP error', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    await expect(
      callProviderTool('openai', 'default', 'search', {})
    ).rejects.toThrow('HTTP 500')
  })

  it('sends correct request body', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response)

    await callProviderTool('myProvider', 'myNs', 'myTool', { key: 'value' })

    const callBody = JSON.parse(mockAuthFetch.mock.calls[0][1]?.body as string)
    expect(callBody.provider).toBe('myProvider')
    expect(callBody.namespace).toBe('myNs')
    expect(callBody.tool).toBe('myTool')
    expect(callBody.args).toEqual({ key: 'value' })
  })
})
