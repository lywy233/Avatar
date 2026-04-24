type JsonRecord = Record<string, unknown>

export type AuthenticatedUser = {
  username: string
}

export type AuthStatus = {
  enabled: boolean
}

const accessTokenStorageKey = 'avatar.auth.access-token'
let authEnabled = true

export const authApiBaseUrl = import.meta.env.VITE_AUTH_API_BASE_URL ?? '/api/auth'
export const authUnauthorizedEvent = 'avatar:auth:unauthorized'

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : undefined
}

function normalizeErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return readString(value)
  }

  if (!isRecord(value)) {
    return undefined
  }

  return readString(value.detail) ?? readString(value.message)
}

function dispatchUnauthorizedEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(authUnauthorizedEvent))
  }
}

export async function readApiErrorMessage(
  response: Response,
  fallback = `API Error: ${response.status} ${response.statusText}`,
): Promise<string> {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      const errorData = (await response.json()) as {
        detail?: unknown
        error?: unknown
        message?: unknown
      }

      return (
        normalizeErrorMessage(errorData.detail) ??
        normalizeErrorMessage(errorData.error) ??
        readString(errorData.message) ??
        fallback
      )
    } catch {
      return fallback
    }
  }

  const text = await response.text().catch(() => '')
  return text.trim() ? text.trim() : fallback
}

export function readStoredAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const accessToken = window.localStorage.getItem(accessTokenStorageKey)
  return accessToken?.trim() || null
}

export function persistAccessToken(accessToken: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(accessTokenStorageKey, accessToken)
  }
}

export function clearStoredAccessToken(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(accessTokenStorageKey)
  }
}

export function setAuthEnabled(enabled: boolean): void {
  authEnabled = enabled

  if (!enabled) {
    clearStoredAccessToken()
  }
}

export function isAuthEnabled(): boolean {
  return authEnabled
}

export function createAuthHeaders(headers?: HeadersInit, accessToken = readStoredAccessToken()) {
  const nextHeaders = new Headers(headers)

  if (accessToken) {
    nextHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  return nextHeaders
}

export async function fetchAuthStatus(signal?: AbortSignal): Promise<AuthStatus> {
  const response = await fetch(`${authApiBaseUrl}/status`, { signal })

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response))
  }

  const payload = (await response.json()) as { enabled?: unknown }
  const enabled = typeof payload.enabled === 'boolean' ? payload.enabled : true
  setAuthEnabled(enabled)
  return { enabled }
}

export async function requestAccessToken(
  username: string,
  password: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!isAuthEnabled()) {
    throw new Error('Authentication is disabled.')
  }

  const response = await fetch(`${authApiBaseUrl}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
    signal,
  })

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response))
  }

  const payload = (await response.json()) as { access_token?: unknown }
  const accessToken = readString(payload.access_token)

  if (!accessToken) {
    throw new Error('The login response did not include an access token.')
  }

  return accessToken
}

export async function fetchAuthenticatedUser(
  signal?: AbortSignal,
  accessToken = readStoredAccessToken(),
): Promise<AuthenticatedUser> {
  if (!isAuthEnabled()) {
    throw new Error('Authentication is disabled.')
  }

  if (!accessToken) {
    throw new Error('Authentication is required.')
  }

  const response = await fetch(`${authApiBaseUrl}/me`, {
    headers: createAuthHeaders(undefined, accessToken),
    signal,
  })

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredAccessToken()
      dispatchUnauthorizedEvent()
    }

    throw new Error(await readApiErrorMessage(response))
  }

  const payload = (await response.json()) as { username?: unknown }
  const username = readString(payload.username)

  if (!username) {
    throw new Error('The authenticated user response did not include a username.')
  }

  return { username }
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!isAuthEnabled()) {
    return fetch(input, init)
  }

  const accessToken = readStoredAccessToken()
  const response = await fetch(input, {
    ...init,
    headers: createAuthHeaders(init.headers, accessToken),
  })

  if (response.status === 401 && accessToken) {
    clearStoredAccessToken()
    dispatchUnauthorizedEvent()
  }

  return response
}
