import {
  type SkillsHubFilterOption,
  type SkillsHubFilters,
  type SkillsHubListResponse,
  type SkillsHubSkillDetail,
  type SkillsHubSkillListItem,
} from '@/pages/skills-hub/types'
import { authFetch } from '@/lib/auth-api'

type ErrorHandler = (title: string, message: string) => void

type RawFilterOption =
  | string
  | {
      value?: unknown
      label?: unknown
      count?: unknown
    }

const DEFAULT_SUMMARY = 'No summary has been provided for this skill yet.'

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

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : undefined
  }

  return undefined
}

function humanizeValue(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (segment) => segment.toUpperCase())
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((entry) => {
            if (typeof entry === 'string') {
              return entry.trim()
            }

            if (isRecord(entry)) {
              return (
                readString(entry.label) ??
                readString(entry.title) ??
                readString(entry.name) ??
                readString(entry.description) ??
                readString(entry.content)
              )
            }

            return undefined
          })
          .filter((entry): entry is string => Boolean(entry)),
      ),
    )
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    )
  }

  return []
}

function normalizeMetadata(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => {
        if (entry === null || entry === undefined) {
          return undefined
        }

        const normalizedValue =
          typeof entry === 'string'
            ? entry
            : typeof entry === 'number' || typeof entry === 'boolean'
              ? String(entry)
              : undefined

        if (!normalizedValue) {
          return undefined
        }

        return [humanizeValue(key), normalizedValue] as const
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry)),
  )
}

function normalizeFilterOption(option: RawFilterOption): SkillsHubFilterOption | undefined {
  if (typeof option === 'string') {
    const trimmedValue = option.trim()
    if (!trimmedValue) {
      return undefined
    }

    return {
      value: trimmedValue,
      label: humanizeValue(trimmedValue),
    }
  }

  if (!isRecord(option)) {
    return undefined
  }

  const value = readString(option.value) ?? readString(option.label)
  if (!value) {
    return undefined
  }

  return {
    value,
    label: readString(option.label) ?? humanizeValue(value),
    count: readNumber(option.count),
  }
}

function dedupeFilterOptions(options: SkillsHubFilterOption[]): SkillsHubFilterOption[] {
  const optionMap = new Map<string, SkillsHubFilterOption>()

  for (const option of options) {
    const existingOption = optionMap.get(option.value)
    if (!existingOption) {
      optionMap.set(option.value, option)
      continue
    }

    optionMap.set(option.value, {
      ...existingOption,
      count: Math.max(existingOption.count ?? 0, option.count ?? 0) || undefined,
    })
  }

  return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label))
}

function createCountedFilterOptions(values: string[]): SkillsHubFilterOption[] {
  const optionCounts = new Map<string, number>()

  for (const value of values) {
    optionCounts.set(value, (optionCounts.get(value) ?? 0) + 1)
  }

  return Array.from(optionCounts.entries())
    .map(([value, count]) => ({
      value,
      label: humanizeValue(value),
      count,
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

function deriveFiltersFromItems(items: SkillsHubSkillListItem[]): SkillsHubFilters {
  return {
    categories: createCountedFilterOptions(items.map((item) => item.category)),
    difficulties: createCountedFilterOptions(items.map((item) => item.difficulty)),
    tags: createCountedFilterOptions(items.flatMap((item) => item.tags)),
  }
}

function normalizeListItem(value: unknown): SkillsHubSkillListItem {
  const record = isRecord(value) ? value : {}
  const title =
    readString(record.title) ??
    readString(record.name) ??
    readString(record.display_name) ??
    'Untitled skill'
  const slug = readString(record.slug) ?? readString(record.id) ?? slugify(title)

  return {
    slug,
    title,
    summary:
      readString(record.summary) ??
      readString(record.description) ??
      readString(record.overview) ??
      DEFAULT_SUMMARY,
    category: readString(record.category) ?? 'uncategorized',
    difficulty: readString(record.difficulty) ?? 'unspecified',
    tags: normalizeStringList(record.tags ?? record.labels ?? record.keywords),
    estimatedMinutes:
      readNumber(
        record.estimated_minutes ??
          record.estimatedMinutes ??
          record.duration_minutes ??
          record.durationMinutes,
      ),
    updatedAt: readString(record.updated_at) ?? readString(record.updatedAt),
  }
}

function normalizeDetail(value: unknown): SkillsHubSkillDetail {
  const record = isRecord(value) ? value : {}
  const listItem = normalizeListItem(record)

  return {
    ...listItem,
    description:
      readString(record.description) ?? readString(record.overview) ?? listItem.summary,
    outcomes: normalizeStringList(record.outcomes ?? record.objectives),
    prerequisites: normalizeStringList(record.prerequisites ?? record.requirements),
    steps: normalizeStringList(record.steps ?? record.instructions ?? record.checklist),
    resources: normalizeStringList(record.resources ?? record.links),
    examples: normalizeStringList(record.examples ?? record.use_cases),
    content: readString(record.content) ?? readString(record.body),
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
            typeof errorData.error === 'string'
              ? errorData.error
              : errorData.error.message || JSON.stringify(errorData.error)
        } else if (errorData.detail) {
          errorMessage =
            typeof errorData.detail === 'string'
              ? errorData.detail
              : errorData.detail.message || JSON.stringify(errorData.detail)
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        // Keep the default HTTP error message when the body is not valid JSON.
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
  const payload = await requestSkillsHub<{
    items?: unknown
    total?: unknown
    filters?: {
      categories?: RawFilterOption[]
      difficulties?: RawFilterOption[]
      tags?: RawFilterOption[]
    }
  }>('/skills', signal, onError)

  const items = Array.isArray(payload.items) ? payload.items.map(normalizeListItem) : []
  const derivedFilters = deriveFiltersFromItems(items)
  const categoryFilters = dedupeFilterOptions(
    (payload.filters?.categories ?? []).map(normalizeFilterOption).filter(Boolean) as SkillsHubFilterOption[],
  )
  const difficultyFilters = dedupeFilterOptions(
    (payload.filters?.difficulties ?? [])
      .map(normalizeFilterOption)
      .filter(Boolean) as SkillsHubFilterOption[],
  )
  const tagFilters = dedupeFilterOptions(
    (payload.filters?.tags ?? []).map(normalizeFilterOption).filter(Boolean) as SkillsHubFilterOption[],
  )

  return {
    items,
    total: readNumber(payload.total) ?? items.length,
    filters: {
      categories: categoryFilters.length > 0 ? categoryFilters : derivedFilters.categories,
      difficulties: difficultyFilters.length > 0 ? difficultyFilters : derivedFilters.difficulties,
      tags: tagFilters.length > 0 ? tagFilters : derivedFilters.tags,
    },
  }
}

export async function fetchSkillsHubDetail(
  slug: string,
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<SkillsHubSkillDetail> {
  const payload = await requestSkillsHub<unknown>(`/skills/${encodeURIComponent(slug)}`, signal, onError)
  return normalizeDetail(payload)
}
