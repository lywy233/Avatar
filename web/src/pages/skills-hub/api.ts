import {
  type SkillsHubListResponse,
  type SkillsHubSkillDetail,
  type SkillsHubSkillListItem,
  type SkillsHubSkillMetadata,
} from '@/pages/skills-hub/types'
import { authFetch } from '@/lib/auth-api'

type ErrorHandler = (title: string, message: string) => void

const DEFAULT_DESCRIPTION = 'No description has been provided for this skill yet.'

export const skillsHubApiBaseUrl =
  import.meta.env.VITE_SKILLS_HUB_API_BASE_URL ?? '/api/skills-hub'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }

  return undefined
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : undefined))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  )
}

function normalizeMetadata(value: unknown): SkillsHubSkillMetadata {
  const record = isRecord(value) ? value : {}
  const extras = Object.fromEntries(
    Object.entries(record)
      .map(([key, entry]) => {
        if (['version', 'icon', 'tags', 'enabled'].includes(key)) {
          return undefined
        }

        if (entry === null || entry === undefined) {
          return undefined
        }

        if (typeof entry === 'string') {
          return [key, entry] as const
        }

        if (typeof entry === 'number' || typeof entry === 'boolean') {
          return [key, String(entry)] as const
        }

        return [key, JSON.stringify(entry)] as const
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry)),
  )

  return {
    version: readString(record.version) ?? '0.0.1',
    icon: readString(record.icon) ?? '🛠️',
    tags: normalizeStringList(record.tags),
    enabled: readBoolean(record.enabled) ?? true,
    extras,
  }
}

function normalizeSkill(value: unknown): SkillsHubSkillListItem {
  const record = isRecord(value) ? value : {}

  return {
    name: readString(record.name) ?? 'Unnamed skill',
    description: readString(record.description) ?? DEFAULT_DESCRIPTION,
    skillDir: readString(record.skill_dir) ?? readString(record.skillDir) ?? '',
    metadata: normalizeMetadata(record.metadata),
  }
}

async function requestSkillsHub<T>(
  path: string,
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<T> {
  let response: Response

  try {
    response = await authFetch(`${skillsHubApiBaseUrl}${path}`, {
      headers: {
        Accept: 'application/json',
      },
      signal,
    })
  } catch (networkError) {
    if (networkError instanceof DOMException && networkError.name === 'AbortError') {
      throw networkError
    }

    const message = networkError instanceof Error ? networkError.message : 'Network error'
    onError('Request Failed', `Unable to connect: ${message}`)
    throw networkError
  }

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      try {
        const errorData = (await response.json()) as {
          error?: { message?: string } | string
          message?: string
          detail?: { message?: string } | string
        }

        if (errorData.error) {
          errorMessage =
            typeof errorData.error === "string"
              ? errorData.error
              : errorData.error.message || JSON.stringify(errorData.error)
        } else if (errorData.detail) {
          errorMessage =
            typeof errorData.detail === "string"
              ? errorData.detail
              : errorData.detail.message || JSON.stringify(errorData.detail)
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        // Ignore malformed JSON error payloads and keep the default HTTP message.
      }
    } else {
      const text = await response.text().catch(() => '')
      if (text) {
        errorMessage = `${errorMessage}: ${text.substring(0, 200)}`
      }
    }

    onError('API Error', errorMessage)
    throw new Error(errorMessage)
  }

  return (await response.json()) as T
}

export async function fetchSkillsHubList(
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<SkillsHubListResponse> {
  const payload = await requestSkillsHub<{ skills?: unknown }>('/skills', signal, onError)
  const skills = Array.isArray(payload.skills) ? payload.skills.map(normalizeSkill) : []

  return { skills }
}

export async function fetchSkillsHubDetail(
  skillName: string,
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<SkillsHubSkillDetail> {
  const payload = await requestSkillsHub<unknown>(
    `/skills/${encodeURIComponent(skillName)}`,
    signal,
    onError,
  )

  return normalizeSkill(payload)
}
