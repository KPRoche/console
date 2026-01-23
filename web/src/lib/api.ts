const API_BASE = ''
const DEFAULT_TIMEOUT = 5000 // 5 seconds default timeout
const BACKEND_CHECK_INTERVAL = 30000 // 30 seconds between backend checks when unavailable
const BACKEND_FAILURE_THRESHOLD = 2 // Consecutive failures before marking unavailable

// Error class for unauthenticated requests
export class UnauthenticatedError extends Error {
  constructor() {
    super('No authentication token available')
    this.name = 'UnauthenticatedError'
  }
}

// Error class for backend unavailable
export class BackendUnavailableError extends Error {
  constructor() {
    super('Backend API is currently unavailable')
    this.name = 'BackendUnavailableError'
  }
}

// Backend availability tracking
let backendFailureCount = 0
let backendLastCheckTime = 0
let backendAvailable = true // Assume available initially

function markBackendFailure(): void {
  backendFailureCount++
  if (backendFailureCount >= BACKEND_FAILURE_THRESHOLD && backendAvailable) {
    backendAvailable = false
    backendLastCheckTime = Date.now()
    console.log('[API] Backend marked as unavailable after consecutive failures')
  }
}

function markBackendSuccess(): void {
  if (!backendAvailable) {
    console.log('[API] Backend connection restored')
  }
  backendFailureCount = 0
  backendAvailable = true
}

/**
 * Check if the backend is known to be unavailable.
 * If unavailable, only allow checks periodically to see if it's back.
 */
export function isBackendUnavailable(): boolean {
  if (backendAvailable) return false

  // Allow a check if enough time has passed
  const now = Date.now()
  if (now - backendLastCheckTime >= BACKEND_CHECK_INTERVAL) {
    backendLastCheckTime = now
    return false // Allow this request through to check if backend is back
  }

  return true
}

class ApiClient {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('token')
  }

  private createAbortController(timeout: number): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout> } {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    return { controller, timeoutId }
  }

  async get<T = any>(path: string, options?: { headers?: Record<string, string>; timeout?: number; requiresAuth?: boolean }): Promise<{ data: T }> {
    // Skip API calls to protected endpoints when not authenticated
    if (options?.requiresAuth !== false && !this.hasToken()) {
      throw new UnauthenticatedError()
    }

    // Skip if backend is known to be unavailable
    if (isBackendUnavailable()) {
      throw new BackendUnavailableError()
    }

    const headers = { ...this.getHeaders(), ...options?.headers }
    const { controller, timeoutId } = this.createAbortController(options?.timeout ?? DEFAULT_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        if (response.status === 401) {
          console.warn('[API] Unauthorized - token may be expired')
        }
        // Note: 5xx errors don't mark backend unavailable - the backend IS responding,
        // just with an error for that specific endpoint. Only network failures count.
        throw new Error(errorText || `API error: ${response.status}`)
      }
      markBackendSuccess()
      const data = await response.json()
      return { data }
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        markBackendFailure()
        throw new Error(`Request timeout after ${(options?.timeout ?? DEFAULT_TIMEOUT) / 1000}s: ${path}`)
      }
      // Network errors also indicate backend issues
      if (err instanceof TypeError && err.message.includes('fetch')) {
        markBackendFailure()
      }
      throw err
    }
  }

  async post<T = any>(path: string, body?: any, options?: { timeout?: number }): Promise<{ data: T }> {
    // Skip if backend is known to be unavailable
    if (isBackendUnavailable()) {
      throw new BackendUnavailableError()
    }

    const { controller, timeoutId } = this.createAbortController(options?.timeout ?? DEFAULT_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      markBackendSuccess()
      const data = await response.json()
      return { data }
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        markBackendFailure()
        throw new Error(`Request timeout after ${(options?.timeout ?? DEFAULT_TIMEOUT) / 1000}s: ${path}`)
      }
      if (err instanceof TypeError && err.message.includes('fetch')) {
        markBackendFailure()
      }
      throw err
    }
  }

  async put<T = any>(path: string, body?: any, options?: { timeout?: number }): Promise<{ data: T }> {
    // Skip if backend is known to be unavailable
    if (isBackendUnavailable()) {
      throw new BackendUnavailableError()
    }

    const { controller, timeoutId } = this.createAbortController(options?.timeout ?? DEFAULT_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      markBackendSuccess()
      const data = await response.json()
      return { data }
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        markBackendFailure()
        throw new Error(`Request timeout after ${(options?.timeout ?? DEFAULT_TIMEOUT) / 1000}s: ${path}`)
      }
      if (err instanceof TypeError && err.message.includes('fetch')) {
        markBackendFailure()
      }
      throw err
    }
  }

  async delete(path: string, options?: { timeout?: number }): Promise<void> {
    // Skip if backend is known to be unavailable
    if (isBackendUnavailable()) {
      throw new BackendUnavailableError()
    }

    const { controller, timeoutId } = this.createAbortController(options?.timeout ?? DEFAULT_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      markBackendSuccess()
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        markBackendFailure()
        throw new Error(`Request timeout after ${(options?.timeout ?? DEFAULT_TIMEOUT) / 1000}s: ${path}`)
      }
      if (err instanceof TypeError && err.message.includes('fetch')) {
        markBackendFailure()
      }
      throw err
    }
  }
}

export const api = new ApiClient()
