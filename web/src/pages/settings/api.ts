import { authFetch, readApiErrorMessage } from '@/lib/auth-api'

type ErrorHandler = (title: string, message: string) => void

type JsonRecord = Record<string, unknown>

export const settingsApiBaseUrl = import.meta.env.VITE_SETTINGS_API_BASE_URL ?? '/api/settings'

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function requestSettings<T>(
  path: string,
  init: RequestInit,
  onError: ErrorHandler,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response

  try {
    response = await authFetch(`${settingsApiBaseUrl}${path}`, {
      ...init,
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Network request failed.'
    onError('Network Error', message)
    throw error
  }

  if (!response.ok) {
    const message = await readApiErrorMessage(response)
    onError('API Error', message)
    throw new Error(message)
  }

  return (await response.json()) as T
}

export async function fetchUserConfig(
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<JsonRecord> {
  const payload = await requestSettings<unknown>('/user-config', { method: 'GET' }, onError, signal)
  return isRecord(payload) ? payload : {}
}

export async function updateUserConfig(
  payload: JsonRecord,
  onError: ErrorHandler,
): Promise<JsonRecord> {
  const response = await requestSettings<unknown>(
    '/user-config',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    onError,
  )

  return isRecord(response) ? response : {}
}

export async function fetchAgentConfig(
  agentId: string,
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<JsonRecord> {
  const payload = await requestSettings<unknown>(
    `/agent-config?agent_id=${encodeURIComponent(agentId)}`,
    { method: 'GET' },
    onError,
    signal,
  )

  return isRecord(payload) ? payload : {}
}

export async function updateAgentConfig(
  agentId: string,
  payload: JsonRecord,
  onError: ErrorHandler,
): Promise<JsonRecord> {
  const response = await requestSettings<unknown>(
    `/agent-config?agent_id=${encodeURIComponent(agentId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    onError,
  )

  return isRecord(response) ? response : {}
}
