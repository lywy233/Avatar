import {
  ChevronUpIcon,
  Clock3Icon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  RefreshCcwIcon,
  UploadIcon,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { useSearchParams } from 'react-router-dom'

import { AppSidebar } from '@/components/app-sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useErrorHandler } from '@/hooks/use-error-handler'
import {
  downloadFileSystemEntry,
  type FileSystemEntriesResponse,
  type FileSystemEntry,
  fetchFileSystemPreviewText,
  fetchFileSystemEntries,
  fileSystemApiBaseUrl,
  getFileSystemPreviewUrl,
  uploadMediaFile,
} from '@/lib/file-system-api'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0'
const imageExtensions = new Set(['avif', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'])
const audioExtensions = new Set(['aac', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'wav', 'weba'])
const videoExtensions = new Set(['m4v', 'mov', 'mp4', 'mpeg', 'mpg', 'ogv', 'webm'])
const textExtensions = new Set([
  'css',
  'csv',
  'html',
  'ini',
  'js',
  'json',
  'log',
  'md',
  'mjs',
  'py',
  'sh',
  'sql',
  'svg',
  'toml',
  'ts',
  'tsx',
  'txt',
  'xml',
  'yaml',
  'yml',
])
const textContentTypes = new Set([
  'application/javascript',
  'application/json',
  'application/ld+json',
  'application/sql',
  'application/typescript',
  'application/x-sh',
  'application/x-yaml',
  'application/xml',
  'image/svg+xml',
  'text/csv',
  'text/html',
  'text/javascript',
  'text/markdown',
  'text/plain',
  'text/xml',
])
const activeTextContentTypes = new Set(['text/html'])

type FilePreviewKind = 'audio' | 'image' | 'markdown' | 'text' | 'unsupported' | 'video'

function normalizeRelativePath(value: string | null): string {
  const trimmedValue = value?.trim()

  if (!trimmedValue || trimmedValue === '.') {
    return '.'
  }

  return trimmedValue
}

function formatRelativePath(value: string) {
  return value === '.' ? 'Root' : value
}

function buildPathBreadcrumbs(value: string) {
  const normalizedValue = normalizeRelativePath(value)

  if (normalizedValue === '.') {
    return [{ label: 'Root', path: '.' }]
  }

  const pathSegments = normalizedValue.split('/').filter(Boolean)

  return [
    { label: 'Root', path: '.' },
    ...pathSegments.map((segment, index) => ({
      label: segment,
      path: pathSegments.slice(0, index + 1).join('/'),
    })),
  ]
}

function formatTimestamp(value: string) {
  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value || 'Unknown'
  }

  return parsedDate.toLocaleString()
}

function formatFileSize(size: number | null) {
  if (size === null) {
    return '—'
  }

  if (size < 1024) {
    return `${size} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = size / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function getFileExtension(name: string): string {
  const extensionStart = name.lastIndexOf('.')

  if (extensionStart < 0 || extensionStart === name.length - 1) {
    return ''
  }

  return name.slice(extensionStart + 1).toLowerCase()
}

function normalizeContentType(contentType: string | null): string {
  return contentType?.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

function getFilePreviewKind(entry: FileSystemEntry): FilePreviewKind {
  const contentType = normalizeContentType(entry.contentType)
  const extension = getFileExtension(entry.name)

  if (activeTextContentTypes.has(contentType) || extension === 'html') {
    return 'unsupported'
  }

  if (contentType.startsWith('image/') || imageExtensions.has(extension)) {
    return 'image'
  }

  if (contentType.startsWith('audio/') || audioExtensions.has(extension)) {
    return 'audio'
  }

  if (contentType.startsWith('video/') || videoExtensions.has(extension)) {
    return 'video'
  }

  if (contentType === 'text/markdown' || extension === 'md') {
    return 'markdown'
  }

  if (
    contentType.startsWith('text/') ||
    textContentTypes.has(contentType) ||
    textExtensions.has(extension)
  ) {
    return 'text'
  }

  return 'unsupported'
}

function FilePreviewPanel({
  entry,
  markdownPreviewError,
  markdownPreviewLoading,
  markdownPreview,
  previewUrl,
  onDownload,
}: {
  entry: FileSystemEntry
  markdownPreviewError: string | null
  markdownPreviewLoading: boolean
  markdownPreview: string | null
  previewUrl: string
  onDownload: (entry: FileSystemEntry) => void
}) {
  const previewKind = getFilePreviewKind(entry)

  return (
    <Card size="sm" className="border shadow-none">
      <CardHeader className="gap-1 border-b">
        <CardTitle className="text-base">Inline preview</CardTitle>
        <CardDescription>
          {previewKind === 'image'
            ? 'Images render directly inside the detail pane.'
            : previewKind === 'audio'
              ? 'Audio files keep playback controls available inline.'
              : previewKind === 'video'
                ? 'Video files render inline so you can review media without leaving the page.'
                : previewKind === 'markdown'
                  ? 'Markdown files render as formatted content directly inside the detail pane.'
                : previewKind === 'text'
                  ? 'Text-like files use the backend preview endpoint inside an embedded frame.'
                  : 'This file type is not previewable inline, so download remains the primary action.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-4">
        {previewKind === 'image' ? (
          <div className="overflow-hidden rounded-lg border bg-muted/20">
            <img
              src={previewUrl}
              alt={entry.name}
              className="max-h-96 w-full bg-background object-contain"
            />
          </div>
        ) : null}

        {previewKind === 'audio' ? (
          <div className="rounded-lg border bg-muted/20 p-4">
            <audio className="w-full" controls preload="metadata">
              <source src={previewUrl} type={entry.contentType ?? undefined} />
              Your browser cannot play this audio inline.
            </audio>
          </div>
        ) : null}

        {previewKind === 'video' ? (
          <div className="overflow-hidden rounded-lg border bg-muted/20">
            <video className="aspect-video w-full bg-background" controls preload="metadata">
              <source src={previewUrl} type={entry.contentType ?? undefined} />
              Your browser cannot play this video inline.
            </video>
          </div>
        ) : null}

        {previewKind === 'markdown' ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
            {markdownPreviewLoading ? (
              <p className="text-sm leading-6 text-muted-foreground">Loading markdown preview…</p>
            ) : markdownPreviewError ? (
              <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-background p-4">
                <p className="text-sm font-medium">Unable to load markdown preview.</p>
                <p className="text-sm leading-6 text-muted-foreground">{markdownPreviewError}</p>
              </div>
            ) : markdownPreview !== null ? (
              <MarkdownPreviewBlock content={markdownPreview} />
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                This markdown file is empty.
              </p>
            )}
          </div>
        ) : null}

        {previewKind === 'text' ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
            <iframe
              title={`${entry.name} preview`}
              src={previewUrl}
              loading="lazy"
              className="h-96 w-full rounded-md border bg-background"
            />
            <p className="text-sm leading-6 text-muted-foreground">
              If the browser cannot render this text response inline, use the download action below.
            </p>
          </div>
        ) : null}

        {previewKind === 'unsupported' ? (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-4">
            <p className="text-sm font-medium">Preview unavailable for this file type.</p>
            <p className="text-sm leading-6 text-muted-foreground">
              The backend still exposes the file through the existing download endpoint, so you can
              open it with a local app instead.
            </p>
            <div>
              <Button type="button" variant="outline" onClick={() => onDownload(entry)}>
                <DownloadIcon data-icon="inline-start" />
                Download instead
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function MarkdownPreviewBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ className, ...props }) => (
          <a
            className={cn('text-primary underline underline-offset-4', className)}
            rel="noreferrer"
            target="_blank"
            {...props}
          />
        ),
        code: ({ className, children, ...props }) => (
          <code
            className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-xs', className)}
            {...props}
          >
            {children}
          </code>
        ),
        li: ({ className, ...props }) => (
          <li className={cn('ml-5 list-disc', className)} {...props} />
        ),
        ol: ({ className, ...props }) => (
          <ol className={cn('flex flex-col gap-2', className)} {...props} />
        ),
        p: ({ className, ...props }) => (
          <p className={cn('whitespace-pre-wrap', className)} {...props} />
        ),
        pre: ({ className, ...props }) => (
          <pre
            className={cn('overflow-x-auto rounded-xl border bg-muted/60 p-3 text-xs', className)}
            {...props}
          />
        ),
        ul: ({ className, ...props }) => (
          <ul className={cn('flex flex-col gap-2', className)} {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function MetadataField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-all text-sm">{value}</p>
    </div>
  )
}

function EntryCardSkeleton({ index }: { index: number }) {
  return (
    <Card key={`file-system-entry-skeleton-${index}`} size="sm" className="border shadow-none">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex min-w-0 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pb-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </CardContent>
    </Card>
  )
}

export default function FileSystemPage() {
  const { showError } = useErrorHandler()
  const [searchParams, setSearchParams] = useSearchParams()
  const [entriesResponse, setEntriesResponse] = useState<FileSystemEntriesResponse | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [markdownPreviewError, setMarkdownPreviewError] = useState<string | null>(null)
  const [markdownPreviewLoading, setMarkdownPreviewLoading] = useState(false)
  const [markdownPreview, setMarkdownPreview] = useState<string | null>(null)
  const [entriesError, setEntriesError] = useState<string | null>(null)
  const [isEntriesLoading, setIsEntriesLoading] = useState(true)
  const [isUploadPending, setIsUploadPending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const requestedPath = useMemo(
    () => normalizeRelativePath(searchParams.get('path')),
    [searchParams],
  )

  const currentDirectoryPath = normalizeRelativePath(entriesResponse?.currentPath ?? requestedPath)

  const directoryBreadcrumbs = useMemo(
    () => buildPathBreadcrumbs(currentDirectoryPath),
    [currentDirectoryPath],
  )

  const selectedEntry = useMemo(
    () => entriesResponse?.entries.find((entry) => entry.relativePath === selectedPath) ?? null,
    [entriesResponse, selectedPath],
  )

  const selectedEntryPreviewUrl = useMemo(() => {
    if (!selectedEntry || selectedEntry.entryType !== 'file') {
      return null
    }

    return getFileSystemPreviewUrl(selectedEntry.relativePath)
  }, [selectedEntry])

  useEffect(() => {
    if (!selectedEntry || selectedEntry.entryType !== 'file' || getFilePreviewKind(selectedEntry) !== 'markdown') {
      setMarkdownPreviewLoading(false)
      setMarkdownPreviewError(null)
      setMarkdownPreview(null)
      return
    }

    const controller = new AbortController()
    setMarkdownPreview(null)
    setMarkdownPreviewError(null)
    setMarkdownPreviewLoading(true)

    void (async () => {
      try {
        const nextMarkdownPreview = await fetchFileSystemPreviewText(
          selectedEntry.relativePath,
          controller.signal,
          showError,
        )
        setMarkdownPreview(nextMarkdownPreview)
        setMarkdownPreviewLoading(false)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setMarkdownPreview(null)
        setMarkdownPreviewError(
          error instanceof Error ? error.message : 'Unable to load markdown preview.',
        )
        setMarkdownPreviewLoading(false)
      }
    })()

    return () => controller.abort()
  }, [selectedEntry, showError])

  const updatePath = useCallback(
    (nextPath: string) => {
      const nextSearchParams = new URLSearchParams(searchParams)

      if (nextPath === '.') {
        nextSearchParams.delete('path')
      } else {
        nextSearchParams.set('path', nextPath)
      }

      setSearchParams(nextSearchParams)
    },
    [searchParams, setSearchParams],
  )

  const loadEntries = useCallback(
    async (path: string, signal?: AbortSignal) => {
      setIsEntriesLoading(true)
      setEntriesError(null)

      try {
        const nextEntries = await fetchFileSystemEntries(path, signal, showError)
        setEntriesResponse(nextEntries)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setEntriesError(
          error instanceof Error ? error.message : 'Unable to load file-system entries.',
        )
        setEntriesResponse(null)
      } finally {
        setIsEntriesLoading(false)
      }
    },
    [showError],
  )

  useEffect(() => {
    const controller = new AbortController()

    setSelectedPath(null)
    void loadEntries(requestedPath, controller.signal)

    return () => controller.abort()
  }, [loadEntries, requestedPath])

  const handleDirectoryNavigation = (entry: FileSystemEntry) => {
    updatePath(entry.relativePath)
  }

  const handleDownload = useCallback(
    async (entry: FileSystemEntry) => {
      await downloadFileSystemEntry(entry.relativePath, showError)
    },
    [showError],
  )

  const handleUploadChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target
      const files = Array.from(input.files ?? [])
      let uploadedCount = 0
      input.value = ''

      if (files.length === 0) {
        return
      }

      const uploadPath = currentDirectoryPath
      setIsUploadPending(true)

      try {
        for (const file of files) {
          await uploadMediaFile(file, showError, uploadPath)
          uploadedCount += 1
        }
      } finally {
        if (uploadedCount > 0) {
          await loadEntries(uploadPath)
        }
        input.value = ''
        setIsUploadPending(false)
      }
    },
    [currentDirectoryPath, loadEntries, showError],
  )

  const handleEntryKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    entry: FileSystemEntry,
  ) => {
    if (isUploadPending && entry.entryType === 'directory') {
      return
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()

    if (entry.entryType === 'directory') {
      handleDirectoryNavigation(entry)
      return
    }

    setSelectedPath(entry.relativePath)
  }

  const currentPathLabel = formatRelativePath(currentDirectoryPath)
  const rootPathLabel = entriesResponse?.rootPath ?? 'Loading…'
  const entryCountLabel = entriesResponse?.entryCount ?? 0
  const isDirectoryNavigationLocked = isUploadPending

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar appVersion={appVersion} />

        <SidebarInset className="min-h-svh">
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="hidden h-4 sm:block" />

              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg border bg-card text-foreground">
                  <FolderOpenIcon />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">File system</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Browse the configured media root
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">v{appVersion}</Badge>
              <Badge variant="outline" className="hidden sm:inline-flex">
                /file-system
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <Card className="border shadow-none">
              <CardHeader className="gap-3 border-b">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>File system</Badge>
                  <Badge variant="outline">Directory browser</Badge>
                  <Badge variant="outline">Download API</Badge>
                </div>

                <div className="flex flex-col gap-2">
                  <CardTitle className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                    Browse media files with the same shell and detail-first layout used across the app.
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-sm leading-6 md:text-base">
                    This page lists each directory with{' '}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {fileSystemApiBaseUrl}/entries
                    </code>
                    , and downloads files through the matching backend attachment endpoint.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                <Card size="sm" className="border shadow-none">
                  <CardHeader className="gap-1">
                    <CardDescription className="text-xs font-medium uppercase tracking-[0.18em]">
                      Current directory
                    </CardDescription>
                    <CardTitle className="text-lg">{currentPathLabel}</CardTitle>
                    <CardDescription>
                      {entriesResponse?.parentPath ? 'Use the parent action to move up one level.' : 'You are at the configured root directory.'}
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card size="sm" className="border shadow-none">
                 <CardHeader className="gap-1">
                   <CardDescription className="text-xs font-medium uppercase tracking-[0.18em]">
                     Root path
                   </CardDescription>
                    <CardTitle className="break-all text-lg">{rootPathLabel}</CardTitle>
                    <CardDescription>The active root reported by the entries API.</CardDescription>
                  </CardHeader>
                </Card>

                <Card size="sm" className="border shadow-none">
                  <CardHeader className="gap-1">
                    <CardDescription className="text-xs font-medium uppercase tracking-[0.18em]">
                      Entry count
                    </CardDescription>
                    <CardTitle className="text-lg">{entryCountLabel}</CardTitle>
                    <CardDescription>
                      Directories stay ahead of files to match the backend ordering.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
              <Card className="border shadow-none">
                <CardHeader className="gap-3 border-b">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <CardTitle>Directory browser</CardTitle>
                      <CardDescription>
                        Click a directory card to enter it, or inspect any entry from the action row.
                      </CardDescription>
                    </div>

                     <div className="flex flex-wrap gap-2">
                      <input
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        type="file"
                        disabled={isEntriesLoading || isUploadPending}
                        onChange={(event) => {
                          void handleUploadChange(event)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isEntriesLoading || isUploadPending}
                        onClick={() => {
                          fileInputRef.current?.click()
                        }}
                      >
                        <UploadIcon data-icon="inline-start" />
                        {isUploadPending ? 'Uploading…' : 'Upload files'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!entriesResponse?.parentPath || isEntriesLoading || isUploadPending}
                        onClick={() => {
                          if (!entriesResponse?.parentPath) {
                            return
                          }

                          updatePath(entriesResponse.parentPath)
                        }}
                      >
                        <ChevronUpIcon data-icon="inline-start" />
                        Parent
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isEntriesLoading || isUploadPending}
                        onClick={() => {
                          void loadEntries(requestedPath)
                        }}
                      >
                        <RefreshCcwIcon data-icon="inline-start" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4 pt-6">
                  <nav
                    aria-label="Current directory breadcrumb"
                    className="rounded-xl border bg-muted/20 p-4"
                  >
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Path
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {directoryBreadcrumbs.map((segment, index) => {
                          const isCurrentSegment = segment.path === currentDirectoryPath

                          return (
                            <div key={segment.path} className="flex items-center gap-1.5">
                              {index > 0 ? (
                                <span className="text-sm text-muted-foreground">/</span>
                              ) : null}

                               <Button
                                 type="button"
                                 variant={isCurrentSegment ? 'secondary' : 'ghost'}
                                 size="sm"
                                 className="max-w-full"
                                 disabled={isUploadPending}
                                 title={segment.path === '.' ? 'Root' : segment.path}
                                 aria-current={isCurrentSegment ? 'page' : undefined}
                                 onClick={() => {
                                  updatePath(segment.path)
                                }}
                              >
                                {segment.label}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </nav>

                  <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Directory
                      </p>
                      <p className="text-sm font-medium">{currentPathLabel}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Root
                      </p>
                      <p className="break-all text-sm">{rootPathLabel}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Items
                      </p>
                      <p className="text-sm font-medium">{entryCountLabel}</p>
                    </div>
                  </div>

                  {isEntriesLoading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <EntryCardSkeleton key={`entry-skeleton-${index}`} index={index} />
                      ))
                    : null}

                  {!isEntriesLoading && entriesError ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-6">
                      <p className="text-sm font-medium">Unable to load this directory.</p>
                      <p className="text-sm leading-6 text-muted-foreground">{entriesError}</p>
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            void loadEntries(requestedPath)
                          }}
                        >
                          Try again
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {!isEntriesLoading && !entriesError && entriesResponse?.entries.length === 0 ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-6">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FolderIcon className="text-muted-foreground" />
                        Empty directory
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        This folder exists, but it does not contain any child directories or files yet.
                      </p>
                    </div>
                  ) : null}

                  {!isEntriesLoading && !entriesError
                    ? entriesResponse?.entries.map((entry) => {
                        const isSelected = selectedPath === entry.relativePath

                        return (
                           <Card
                             key={entry.relativePath}
                             size="sm"
                             role="button"
                             tabIndex={entry.entryType === 'directory' && isDirectoryNavigationLocked ? -1 : 0}
                             onClick={() => {
                               if (entry.entryType === 'directory' && isDirectoryNavigationLocked) {
                                 return
                               }

                               if (entry.entryType === 'directory') {
                                 handleDirectoryNavigation(entry)
                                 return
                              }

                              setSelectedPath(entry.relativePath)
                            }}
                            onKeyDown={(event) => handleEntryKeyDown(event, entry)}
                            className={cn(
                               'border shadow-none transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                               'cursor-pointer',
                               entry.entryType === 'directory' && isDirectoryNavigationLocked
                                 ? 'cursor-not-allowed opacity-70'
                                 : '',
                               isSelected ? 'bg-muted/30 ring-2 ring-ring' : '',
                             )}
                           >
                            <CardHeader className="gap-2">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/20 text-muted-foreground">
                                    {entry.entryType === 'directory' ? <FolderIcon /> : <FileIcon />}
                                  </div>
                                  <div className="flex min-w-0 flex-col gap-1">
                                    <CardTitle className="break-all text-base">{entry.name}</CardTitle>
                                    <CardDescription className="break-all">
                                      {entry.relativePath}
                                    </CardDescription>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {entry.entryType === 'directory' ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={isDirectoryNavigationLocked}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setSelectedPath(entry.relativePath)
                                      }}
                                    >
                                      Inspect
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                         void handleDownload(entry)
                                      }}
                                    >
                                      <DownloadIcon data-icon="inline-start" />
                                      Download
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent className="flex flex-wrap gap-2 pb-3">
                              <Badge variant={entry.entryType === 'directory' ? 'secondary' : 'outline'}>
                                {entry.entryType === 'directory' ? 'Directory' : 'File'}
                              </Badge>
                              <Badge variant="outline">{formatFileSize(entry.size)}</Badge>
                              <Badge variant="outline">Updated {formatTimestamp(entry.modifiedAt)}</Badge>
                            </CardContent>
                          </Card>
                        )
                      })
                    : null}
                </CardContent>
              </Card>

              <Card className="border shadow-none xl:sticky xl:top-6">
                <CardHeader className="gap-3 border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <CardTitle>{selectedEntry?.name ?? 'Selection detail'}</CardTitle>
                      <CardDescription>
                        {selectedEntry
                          ? 'Inspect metadata for the selected entry and trigger the matching action.'
                          : 'Pick Inspect on a directory or click a file card to review metadata here.'}
                      </CardDescription>
                    </div>

                    {selectedEntry?.entryType === 'directory' ? (
                      <FolderOpenIcon className="text-muted-foreground" />
                    ) : (
                      <FileIcon className="text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-6 pt-6">
                  {!selectedEntry ? (
                    <div className="flex flex-col gap-4 rounded-lg border border-dashed bg-muted/20 p-6">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock3Icon className="text-muted-foreground" />
                        Waiting for selection
                      </div>
                       <p className="text-sm leading-6 text-muted-foreground">
                         The browser starts at the configured root. Enter folders from the list, or
                         inspect a directory or file to view its metadata and actions here.
                       </p>
                       <div className="grid gap-3 sm:grid-cols-2">
                         <MetadataField label="Current directory" value={currentPathLabel} />
                         <MetadataField label="Root path" value={rootPathLabel} />
                         <MetadataField label="Entry count" value={String(entryCountLabel)} />
                       </div>
                     </div>
                  ) : null}

                  {selectedEntry ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={selectedEntry.entryType === 'directory' ? 'secondary' : 'outline'}>
                          {selectedEntry.entryType === 'directory' ? 'Directory' : 'File'}
                        </Badge>
                        {selectedEntry.contentType ? (
                          <Badge variant="outline">{selectedEntry.contentType}</Badge>
                        ) : null}
                        <Badge variant="outline">Modified {formatTimestamp(selectedEntry.modifiedAt)}</Badge>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {selectedEntry.entryType === 'directory' ? (
                          <Button
                            type="button"
                            disabled={isDirectoryNavigationLocked}
                            onClick={() => {
                              handleDirectoryNavigation(selectedEntry)
                            }}
                          >
                            <FolderOpenIcon data-icon="inline-start" />
                            Open directory
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => {
                               void handleDownload(selectedEntry)
                             }}
                           >
                            <DownloadIcon data-icon="inline-start" />
                            Download file
                          </Button>
                        )}
                      </div>

                      {selectedEntry.entryType === 'file' && selectedEntryPreviewUrl ? (
                        <FilePreviewPanel
                          entry={selectedEntry}
                          markdownPreviewError={markdownPreviewError}
                          markdownPreviewLoading={markdownPreviewLoading}
                          markdownPreview={markdownPreview}
                          previewUrl={selectedEntryPreviewUrl}
                          onDownload={(entry) => {
                            void handleDownload(entry)
                          }}
                        />
                      ) : null}

                      <Separator />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <MetadataField label="Name" value={selectedEntry.name} />
                        <MetadataField
                          label="Relative path"
                          value={selectedEntry.relativePath}
                        />
                        <MetadataField
                          label="Entry type"
                          value={selectedEntry.entryType}
                        />
                        <MetadataField label="Size" value={formatFileSize(selectedEntry.size)} />
                        <MetadataField
                          label="Modified at"
                          value={formatTimestamp(selectedEntry.modifiedAt)}
                        />
                        <MetadataField
                          label="Content type"
                          value={selectedEntry.contentType ?? '—'}
                        />
                        <MetadataField label="Root path" value={rootPathLabel} />
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
