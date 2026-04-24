import { authFetch, readApiErrorMessage } from '@/lib/auth-api'

import {
  type ActiveModelInfo,
  type CreateCustomProviderInput,
  type ModelProviderInfo,
  type ModelProviderModel,
} from '@/pages/model-provider/types'

type ErrorHandler = (title: string, message: string) => void

type JsonRecord = Record<string, unknown>

export type UpdateModelProviderConfigInput = {
  apiKey: string
  baseUrl: string
  chatModel: string
  generateKwargs: Record<string, unknown>
}

export const modelProviderApiBaseUrl =
  import.meta.env.VITE_MODEL_PROVIDER_API_BASE_URL ?? '/api/model-provider'

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function normalizeGenerateKwargs(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function normalizeModel(value: unknown): ModelProviderModel {
  const record = isRecord(value) ? value : {}

  return {
    id: readString(record.id) ?? readString(record.name) ?? 'unknown-model',
    name: readString(record.name) ?? readString(record.id) ?? 'Unknown model',
    supportsImage: readBoolean(record.supports_image) ?? null,
    supportsVideo: readBoolean(record.supports_video) ?? null,
  }
}

function normalizeProvider(value: unknown): ModelProviderInfo {
  const record = isRecord(value) ? value : {}

  return {
    id: readString(record.id) ?? 'unknown-provider',
    name: readString(record.name) ?? readString(record.id) ?? 'Unknown provider',
    source: readString(record.source) ?? 'built-in',
    baseUrl: readString(record.base_url) ?? '',
    apiKey: readString(record.api_key) ?? '',
    chatModel: readString(record.chat_model) ?? '',
    models: Array.isArray(record.models) ? record.models.map(normalizeModel) : [],
    generateKwargs: normalizeGenerateKwargs(record.generate_kwargs),
    supportConnectionCheck: readBoolean(record.support_connection_check) ?? false,
  }
}

function serializeOptionalString(value: string): string | null {
  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : null
}

async function requestModelProvider<T>(
  path: string,
  init: RequestInit,
  onError: ErrorHandler,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response

  try {
    response = await authFetch(`${modelProviderApiBaseUrl}${path}`, {
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

export async function fetchModelProviders(
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<ModelProviderInfo[]> {
  const payload = await requestModelProvider<unknown[]>('', { method: 'GET' }, onError, signal)
  return Array.isArray(payload) ? payload.map(normalizeProvider) : []
}

export async function updateModelProviderConfig(
  providerId: string,
  input: UpdateModelProviderConfigInput,
  onError: ErrorHandler,
): Promise<ModelProviderInfo> {
  const payload = await requestModelProvider<unknown>(
    `/${encodeURIComponent(providerId)}/config`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: serializeOptionalString(input.apiKey),
        base_url: serializeOptionalString(input.baseUrl),
        chat_model: serializeOptionalString(input.chatModel),
        generate_kwargs: input.generateKwargs,
      }),
    },
    onError,
  )

  return normalizeProvider(payload)
}

export async function createCustomProvider(
  input: CreateCustomProviderInput,
  onError: ErrorHandler,
): Promise<ModelProviderInfo> {
  const payload = await requestModelProvider<unknown>(
    '/custom-providers',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: input.id.trim(),
        name: input.name.trim(),
        default_base_url: input.defaultBaseUrl?.trim() ?? '',
        api_key_prefix: input.apiKeyPrefix?.trim() ?? '',
        chat_model: input.chatModel ?? 'OpenAIChatModel',
        models: [],
      }),
    },
    onError,
  )

  return normalizeProvider(payload)
}

export async function deleteCustomProvider(
  providerId: string,
  onError: ErrorHandler,
): Promise<ModelProviderInfo[]> {
  const payload = await requestModelProvider<unknown[]>(
    `/custom-providers/${encodeURIComponent(providerId)}`,
    { method: 'DELETE' },
    onError,
  )
  return Array.isArray(payload) ? payload.map(normalizeProvider) : []
}

function normalizeActiveModel(value: unknown): ActiveModelInfo {
  const record = isRecord(value) ? value : {}
  return {
    providerId: readString(record.provider_id) ?? '',
    model: readString(record.model) ?? '',
  }
}

export async function fetchActiveModel(
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<ActiveModelInfo> {
  const payload = await requestModelProvider<unknown>('/active-model', { method: 'GET' }, onError, signal)
  return normalizeActiveModel(payload)
}

export async function activateModel(
  input: { providerId: string; model: string },
  onError: ErrorHandler,
): Promise<ActiveModelInfo> {
  const payload = await requestModelProvider<unknown>(
    '/activate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider_id: input.providerId,
        model: input.model,
      }),
    },
    onError,
  )
  return normalizeActiveModel(payload)
}

export type AddModelInput = {
  id: string
  name: string
}

export async function addModelToProvider(
  providerId: string,
  input: AddModelInput,
  onError: ErrorHandler,
): Promise<ModelProviderInfo> {
  const payload = await requestModelProvider<unknown>(
    `/${encodeURIComponent(providerId)}/models`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: input.id.trim(),
        name: input.name.trim(),
      }),
    },
    onError,
  )
  return normalizeProvider(payload)
}

export async function deleteModelFromProvider(
  providerId: string,
  modelId: string,
  onError: ErrorHandler,
): Promise<ModelProviderInfo> {
  const payload = await requestModelProvider<unknown>(
    `/${encodeURIComponent(providerId)}/models/${encodeURIComponent(modelId)}`,
    { method: 'DELETE' },
    onError,
  )
  return normalizeProvider(payload)
}
