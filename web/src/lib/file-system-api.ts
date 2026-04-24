import { authFetch, isAuthEnabled, readStoredAccessToken } from '@/lib/auth-api'

type ErrorHandler = (title: string, message: string) => void

export const fileSystemApiBaseUrl =
  import.meta.env.VITE_FILE_SYSTEM_API_BASE_URL ?? '/api/file-system'

export type FileSystemSettings = {
  mediaDir: string
  resolvedMediaDir: string
  defaultMediaDir: string
  source: string
}

export type FileSystemEntry = {
  name: string
  relativePath: string
  entryType: 'directory' | 'file'
  size: number | null
  modifiedAt: string
  contentType: string | null
}

export type FileSystemEntriesResponse = {
  currentPath: string
  parentPath: string | null
  rootPath: string
  entryCount: number
  entries: FileSystemEntry[]
}

export type UploadedMediaAsset = {
  relativePath: string
  name: string
  contentType: string
  size: number
  mediaKind: 'audio' | 'file' | 'image' | 'video'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

async function handleErrorResponse(response: Response, onError: ErrorHandler): Promise<never> {
  let errorMessage = `API Error: ${response.status} ${response.statusText}`
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      const errorData = (await response.json()) as { detail?: unknown; message?: unknown }
      errorMessage =
        readString(errorData.detail) ?? readString(errorData.message) ?? errorMessage
    } catch {
      // Keep the default message when the body cannot be parsed.
    }
  } else {
    const text = await response.text().catch(() => '')
    if (text) {
      errorMessage = text
    }
  }

  onError('API Error', errorMessage)
  throw new Error(errorMessage)
}

function normalizeSettings(value: unknown): FileSystemSettings {
  const record = isRecord(value) ? value : {}

  return {
    mediaDir: readString(record.media_dir) ?? '.avatar/media',
    resolvedMediaDir: readString(record.resolved_media_dir) ?? '.avatar/media',
    defaultMediaDir: readString(record.default_media_dir) ?? '.avatar/media',
    source: readString(record.source) ?? 'default',
  }
}

function normalizeUploadedMediaAsset(value: unknown): UploadedMediaAsset {
  const record = isRecord(value) ? value : {}

  return {
    relativePath: readString(record.relative_path) ?? '.',
    name: readString(record.name) ?? 'upload.bin',
    contentType: readString(record.content_type) ?? 'application/octet-stream',
    size: readNumber(record.size) ?? 0,
    mediaKind:
      (readString(record.media_kind) as UploadedMediaAsset['mediaKind'] | undefined) ?? 'file',
  }
}

function normalizeFileSystemEntry(value: unknown): FileSystemEntry {
  const record = isRecord(value) ? value : {}
  const entryType = readString(record.entry_type)

  return {
    name: readString(record.name) ?? 'Unknown entry',
    relativePath: readString(record.relative_path) ?? '.',
    entryType: entryType === 'directory' ? 'directory' : 'file',
    size: readNumber(record.size) ?? null,
    modifiedAt: readString(record.modified_at) ?? '',
    contentType: readString(record.content_type) ?? null,
  }
}

function normalizeFileSystemEntriesResponse(value: unknown): FileSystemEntriesResponse {
  const record = isRecord(value) ? value : {}
  const rawEntries = Array.isArray(record.entries) ? record.entries : []

  return {
    currentPath: readString(record.current_path) ?? '.',
    parentPath: readString(record.parent_path) ?? null,
    rootPath: readString(record.root_path) ?? '.',
    entryCount: readNumber(record.entry_count) ?? rawEntries.length,
    entries: rawEntries.map((entry) => normalizeFileSystemEntry(entry)),
  }
}

function buildPathQuery(path: string | undefined): string {
  const normalizedPath = path

  if (!normalizedPath || normalizedPath === '.') {
    return ''
  }

  const searchParams = new URLSearchParams({ path: normalizedPath })
  return `?${searchParams.toString()}`
}

function buildAuthenticatedPathQuery(path: string | undefined): string {
  const searchParams = new URLSearchParams()
  const normalizedPath = path?.trim()

  if (normalizedPath && normalizedPath !== '.') {
    searchParams.set('path', normalizedPath)
  } else {
    searchParams.set('path', '.')
  }

  const accessToken = readStoredAccessToken()
  if (isAuthEnabled() && accessToken) {
    searchParams.set('access_token', accessToken)
  }

  return `?${searchParams.toString()}`
}

export async function fetchFileSystemSettings(
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<FileSystemSettings> {
  const response = await authFetch(`${fileSystemApiBaseUrl}/settings`, { signal })
  if (!response.ok) {
    return handleErrorResponse(response, onError)
  }

  return normalizeSettings(await response.json())
}

export async function fetchFileSystemEntries(
  path: string | undefined,
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<FileSystemEntriesResponse> {
  const response = await authFetch(`${fileSystemApiBaseUrl}/entries${buildPathQuery(path)}`, {
    signal,
  })
  if (!response.ok) {
    return handleErrorResponse(response, onError)
  }

  return normalizeFileSystemEntriesResponse(await response.json())
}

export function getFileSystemDownloadUrl(relativePath: string): string {
  return `${fileSystemApiBaseUrl}/download${buildAuthenticatedPathQuery(relativePath)}`
}

export function getFileSystemPreviewUrl(relativePath: string): string {
  return `${fileSystemApiBaseUrl}/preview${buildAuthenticatedPathQuery(relativePath)}`
}

export function getFileSystemDeleteUrl(relativePath: string): string {
  const searchParams = new URLSearchParams({ path: relativePath || '.' })
  return `${fileSystemApiBaseUrl}/delete?${searchParams.toString()}`
}

export async function fetchFileSystemPreviewText(
  relativePath: string,
  signal: AbortSignal | undefined,
  onError: ErrorHandler,
): Promise<string> {
  const response = await authFetch(getFileSystemPreviewUrl(relativePath), { signal })
  if (!response.ok) {
    return handleErrorResponse(response, onError)
  }

  return response.text()
}

function inferDownloadFilename(response: Response, fallbackName: string): string {
  const disposition = response.headers.get('content-disposition') || ''
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const simpleMatch = disposition.match(/filename="?([^";]+)"?/i)
  return simpleMatch?.[1] || fallbackName
}

export async function downloadFileSystemEntry(
  relativePath: string,
  onError: ErrorHandler,
): Promise<void> {
  const response = await authFetch(getFileSystemDownloadUrl(relativePath))
  if (!response.ok) {
    return handleErrorResponse(response, onError)
  }

  const fileBlob = await response.blob()
  const objectUrl = URL.createObjectURL(fileBlob)
  const downloadLink = document.createElement('a')
  downloadLink.href = objectUrl
  downloadLink.download = inferDownloadFilename(
    response,
    relativePath.split('/').pop() || 'download',
  )
  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function uploadMediaFile(
  file: File,
  onError: ErrorHandler,
  path?: string,
): Promise<UploadedMediaAsset> {
  const formData = new FormData()
  formData.append('file', file)
  const normalizedPath = path?.trim()
  if (normalizedPath && normalizedPath !== '.') {
    formData.append('path', normalizedPath)
  }

  const response = await authFetch(`${fileSystemApiBaseUrl}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    return handleErrorResponse(response, onError)
  }

  return normalizeUploadedMediaAsset(await response.json())
}

export async function deleteMediaFile(relativePath: string): Promise<void> {
  const response = await authFetch(getFileSystemDeleteUrl(relativePath), {
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Unable to delete uploaded media: ${response.status} ${response.statusText}`)
  }
}
