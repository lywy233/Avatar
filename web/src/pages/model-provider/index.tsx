import {
  BotIcon,
  CableIcon,
  KeyRoundIcon,
  PlusIcon,
  RefreshCcwIcon,
  SaveIcon,
  Settings2Icon,
  Trash2Icon,
} from 'lucide-react'
import { useState, type KeyboardEvent, type ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useErrorHandler } from '@/hooks/use-error-handler'
import { cn } from '@/lib/utils'
import { modelProviderApiBaseUrl } from '@/pages/model-provider/api'
import { type CreateCustomProviderInput } from '@/pages/model-provider/types'
import { type ModelProviderInfo } from '@/pages/model-provider/types'
import { useModelProvider } from '@/pages/model-provider/use-model-provider'

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0'

function FieldBlock({
  children,
  description,
  error,
  htmlFor,
  label,
}: {
  children: ReactNode
  description: string
  error?: string | null
  htmlFor: string
  label: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function SummaryMetricCard({
  description,
  label,
  value,
}: {
  description: string
  label: string
  value: string
}) {
  return (
    <Card size="sm" className="border shadow-none">
      <CardHeader className="gap-1">
        <CardDescription className="text-xs font-medium uppercase tracking-[0.18em]">
          {label}
        </CardDescription>
        <CardTitle className="text-lg">{value}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function ProviderMetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function ProviderCard({
  isSelected,
  onClick,
  onKeyDown,
  provider,
}: {
  isSelected: boolean
  onClick: () => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  provider: ModelProviderInfo
}) {
  const previewModels = provider.models.slice(0, 3)

  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'cursor-pointer border shadow-none transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected ? 'bg-muted/30 ring-2 ring-ring' : '',
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="text-base">{provider.name}</CardTitle>
            <CardDescription className="text-xs">ID: {provider.id}</CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{provider.source}</Badge>
            <Badge variant="outline">{provider.models.length} models</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pb-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProviderMetaField label="Chat model" value={provider.chatModel || 'Not set'} />
          <ProviderMetaField
            label="Connection"
            value={provider.supportConnectionCheck ? 'Supported' : 'Unavailable'}
          />
          <div className="sm:col-span-2">
            <ProviderMetaField label="Base URL" value={provider.baseUrl || 'Not set'} />
          </div>
        </div>

        {previewModels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {previewModels.map((model) => (
              <Badge key={`${provider.id}-${model.id}`} variant="outline">
                {model.name}
              </Badge>
            ))}
            {provider.models.length > previewModels.length ? (
              <Badge variant="outline">+{provider.models.length - previewModels.length} more</Badge>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">No models were returned for this provider.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ProviderEditorSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg sm:col-span-2" />
      </div>
      <Separator />
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  )
}

function AddProviderSheet({
  onSubmit,
  isCreating,
}: {
  onSubmit: (input: CreateCustomProviderInput) => void
  isCreating: boolean
}) {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [chatModel, setChatModel] = useState('OpenAIChatModel')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!id.trim() || !name.trim()) return
    onSubmit({
      id: id.trim(),
      name: name.trim(),
      defaultBaseUrl: baseUrl.trim(),
      chatModel: chatModel.trim(),
    })
    setId('')
    setName('')
    setBaseUrl('')
    setChatModel('OpenAIChatModel')
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <PlusIcon data-icon="inline-start" />
          Add provider
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Add custom provider</SheetTitle>
          <SheetDescription>
            Register a new custom LLM provider. Fill in the required fields to add it to your catalog.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
          <FieldBlock
            htmlFor="add-provider-id"
            label="Provider ID"
            description="Unique identifier, e.g. my-provider"
          >
            <Input
              id="add-provider-id"
              value={id}
              disabled={isCreating}
              placeholder="my-provider"
              onChange={(e) => setId(e.target.value)}
            />
          </FieldBlock>

          <FieldBlock
            htmlFor="add-provider-name"
            label="Provider name"
            description="Human-readable name for this provider"
          >
            <Input
              id="add-provider-name"
              value={name}
              disabled={isCreating}
              placeholder="My Provider"
              onChange={(e) => setName(e.target.value)}
            />
          </FieldBlock>

          <FieldBlock
            htmlFor="add-provider-base-url"
            label="Default base URL"
            description="Optional default API endpoint"
          >
            <Input
              id="add-provider-base-url"
              value={baseUrl}
              disabled={isCreating}
              placeholder="https://api.example.com/v1"
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </FieldBlock>

          <FieldBlock
            htmlFor="add-provider-chat-model"
            label="Chat model class"
            description="Model class name for protocol selection"
          >
            <Input
              id="add-provider-chat-model"
              value={chatModel}
              disabled={isCreating}
              placeholder="OpenAIChatModel"
              onChange={(e) => setChatModel(e.target.value)}
            />
          </FieldBlock>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isCreating || !id.trim() || !name.trim()}>
              {isCreating ? 'Creating...' : 'Create provider'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isCreating}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default function ModelProviderPage() {
  const { showError } = useErrorHandler()
  const {
    canSave,
    draft,
    hasChanges,
    isProvidersLoading,
    isSaving,
    isCreating,
    isDeleting,
    parsedGenerateKwargs,
    providers,
    providersError,
    refreshAll,
    resetDraft,
    saveSelectedProvider,
    selectedProvider,
    selectedProviderId,
    setSelectedProviderId,
    updateDraftField,
    createCustomProvider,
    deleteCustomProvider,
    addModel,
    deleteModel,
    activeModel,
    isActiveModelLoading,
    activateModel,
    isAddingModel,
    isDeletingModel,
  } = useModelProvider({ onError: showError })

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [showAddModelForm, setShowAddModelForm] = useState(false)
  const [newModelId, setNewModelId] = useState('')
  const [newModelName, setNewModelName] = useState('')

  const handleAddModelSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newModelId.trim() || !newModelName.trim() || !selectedProvider) return
    void addModel(selectedProvider.id, { id: newModelId.trim(), name: newModelName.trim() })
    setNewModelId('')
    setNewModelName('')
    setShowAddModelForm(false)
  }

  const totalModels = providers.reduce((count, provider) => count + provider.models.length, 0)
  const providersWithConnectionCheck = providers.filter(
    (provider) => provider.supportConnectionCheck,
  ).length
  const selectedProviderLabel = selectedProvider?.name ?? 'None selected'

  const activeModelLabel = activeModel
    ? `${activeModel.providerId} / ${activeModel.model}`
    : 'Not set'

  const handleProviderCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    providerId: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelectedProviderId(providerId)
    }
  }

  const handleDeleteConfirm = () => {
    if (!selectedProvider) return
    setDeleteConfirmOpen(false)
    void deleteCustomProvider(selectedProvider.id)
  }

  const selectedProviderModels = selectedProvider?.models ?? []

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
                  <Settings2Icon />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Model provider</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Provider catalog and config editor
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">v{appVersion}</Badge>
              <Badge variant="outline" className="hidden sm:inline-flex">
                /model-provider
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <Card className="border shadow-none">
              <CardHeader className="gap-3 border-b">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Model providers</Badge>
                  <Badge variant="outline">Catalog summary</Badge>
                  <Badge variant="outline">Provider API</Badge>
                </div>

                <div className="flex flex-col gap-2">
                  <CardTitle className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                    Browse the provider catalog, then update provider-level credentials below.
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-sm leading-6 md:text-base">
                    This page loads the catalog from{' '}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {modelProviderApiBaseUrl}
                    </code>
                    . Select a provider card to review its catalog metadata and save provider-level
                    configuration in place.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-4">
                <SummaryMetricCard
                  label="Providers"
                  value={String(providers.length)}
                  description={`Catalog entries currently available from ${modelProviderApiBaseUrl}.`}
                />
                <SummaryMetricCard
                  label="Available models"
                  value={String(totalModels)}
                  description="Combined models surfaced across all provider catalog entries."
                />
                <SummaryMetricCard
                  label="Selected provider"
                  value={selectedProviderLabel}
                  description={`${providersWithConnectionCheck} provider${providersWithConnectionCheck === 1 ? '' : 's'} support connection checks.`}
                />
                <SummaryMetricCard
                  label="Active model"
                  value={isActiveModelLoading ? '...' : activeModelLabel}
                  description="Model currently used by the agent runtime."
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
              <Card className="border shadow-none">
                <CardHeader className="gap-3 border-b">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <CardTitle>Provider list</CardTitle>
                      <CardDescription>
                        Select a provider card to edit its API key, base URL, chat model, and
                        provider-level generate kwargs.
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{providers.length} total</Badge>
                      <AddProviderSheet onSubmit={createCustomProvider} isCreating={isCreating} />
                      <Button type="button" size="sm" variant="outline" onClick={() => void refreshAll()}>
                        <RefreshCcwIcon data-icon="inline-start" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3 pt-6">
                  {isProvidersLoading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <Card key={`provider-skeleton-${index}`} size="sm" className="border shadow-none">
                          <CardHeader className="gap-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </CardHeader>
                          <CardContent className="flex flex-col gap-3 pb-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Skeleton className="h-20 rounded-lg" />
                              <Skeleton className="h-20 rounded-lg" />
                              <Skeleton className="h-20 rounded-lg sm:col-span-2" />
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    : null}

                  {!isProvidersLoading && providersError ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-6">
                      <p className="text-sm font-medium">Unable to load the provider catalog.</p>
                      <p className="text-sm leading-6 text-muted-foreground">{providersError}</p>
                      <div>
                        <Button type="button" variant="outline" onClick={() => void refreshAll()}>
                          Try again
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {!isProvidersLoading && !providersError && providers.length === 0 ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-6">
                      <p className="text-sm font-medium">No providers were returned.</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Refresh the page once the backend has provider data available.
                      </p>
                    </div>
                  ) : null}

                  {!isProvidersLoading && !providersError
                    ? providers.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          isSelected={selectedProviderId === provider.id}
                          onClick={() => setSelectedProviderId(provider.id)}
                          onKeyDown={(event) => handleProviderCardKeyDown(event, provider.id)}
                        />
                      ))
                    : null}
                </CardContent>
              </Card>

              <Card className="border shadow-none xl:sticky xl:top-6">
                <CardHeader className="gap-3 border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <CardTitle>{selectedProvider?.name ?? 'Provider detail'}</CardTitle>
                      <CardDescription>
                        {selectedProvider
                          ? 'Edit the selected provider in place and save it through the provider config endpoint.'
                          : 'Pick a provider card to configure it here.'}
                      </CardDescription>
                    </div>

                    <BotIcon className="text-muted-foreground" />
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-6 pt-6">
                  {isProvidersLoading && !selectedProvider ? <ProviderEditorSkeleton /> : null}

                  {!isProvidersLoading && !selectedProvider ? (
                    <div className="flex flex-col gap-4 rounded-lg border border-dashed bg-muted/20 p-6">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CableIcon className="text-muted-foreground" />
                        Waiting for selection
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Choose a provider from the list to inspect and update its current
                        configuration.
                      </p>
                    </div>
                  ) : null}

                  {selectedProvider ? (
                    <>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{selectedProvider.source}</Badge>
                            <Badge variant="outline">{selectedProvider.models.length} models</Badge>
                            <Badge variant="outline">{selectedProvider.id}</Badge>
                          </div>
                          {selectedProvider.source === 'custom' ? (
                            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete provider</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &ldquo;{selectedProvider.name}&rdquo;?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDeleteConfirm}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : null}
                          {selectedProvider.source === 'custom' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmOpen(true)}
                            >
                              <Trash2Icon data-icon="inline-start" />
                              Delete
                            </Button>
                          ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <ProviderMetaField label="Catalog name" value={selectedProvider.name} />
                          <ProviderMetaField
                            label="Chat model"
                            value={selectedProvider.chatModel || 'Not set'}
                          />
                          <div className="sm:col-span-2">
                            <ProviderMetaField
                              label="Current base URL"
                              value={selectedProvider.baseUrl || 'Not set'}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-medium">Models</p>
                          {selectedProvider.source === 'custom' && !showAddModelForm ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setShowAddModelForm(true)}
                            >
                              <PlusIcon data-icon="inline-start" />
                              Add model
                            </Button>
                          ) : null}
                        </div>

                        {showAddModelForm && (
                          <form
                            onSubmit={handleAddModelSubmit}
                            className="flex flex-col gap-3 rounded-lg border p-4"
                          >
                            <div className="flex flex-col gap-2">
                              <Input
                                placeholder="Model ID (e.g. gpt-4)"
                                value={newModelId}
                                disabled={isAddingModel}
                                onChange={(e) => setNewModelId(e.target.value)}
                              />
                              <Input
                                placeholder="Model name (e.g. GPT-4)"
                                value={newModelName}
                                disabled={isAddingModel}
                                onChange={(e) => setNewModelName(e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                size="sm"
                                disabled={isAddingModel || !newModelId.trim() || !newModelName.trim()}
                              >
                                {isAddingModel ? 'Adding...' : 'Add'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isAddingModel}
                                onClick={() => {
                                  setShowAddModelForm(false)
                                  setNewModelId('')
                                  setNewModelName('')
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        )}

                        {selectedProviderModels.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {selectedProviderModels.map((model) => {
                              const isActive =
                                activeModel !== null &&
                                activeModel.providerId === selectedProvider.id &&
                                activeModel.model === model.id
                              return (
                                <div
                                  key={model.id}
                                  className={cn(
                                    'flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors',
                                    isActive
                                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                                      : 'bg-muted/10',
                                  )}
                                >
                                  <div className="flex min-w-0 flex-col">
                                    <span className="text-sm font-medium truncate">{model.name}</span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {model.id}
                                      {model.supportsImage ? ' · vision' : ''}
                                      {model.supportsVideo ? ' · video' : ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isActive ? (
                                      <Badge variant="secondary" className="text-green-600">
                                        Active
                                      </Badge>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void activateModel(selectedProvider.id, model.id)}
                                      >
                                        Set active
                                      </Button>
                                    )}
                                    {selectedProvider.source === 'custom' && (
                                      <Button
                                        type="button"
                                        size="icon-sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        disabled={isDeletingModel}
                                        onClick={() => void deleteModel(selectedProvider.id, model.id)}
                                      >
                                        <Trash2Icon data-icon="inline-start" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          !showAddModelForm && (
                            <p className="text-sm text-muted-foreground">No models. Add one to get started.</p>
                          )
                        )}
                      </div>

                      <Separator />

                      <div className="flex flex-col gap-5">
                        <FieldBlock
                          htmlFor="provider-api-key"
                          label="API key"
                          description="Leave this blank to clear the provider-level API key override."
                        >
                          <div className="relative">
                            <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="provider-api-key"
                              type="password"
                              value={draft.apiKey}
                              disabled={isSaving}
                              placeholder="sk-..."
                              className="pl-9"
                              onChange={(event) => updateDraftField('apiKey', event.target.value)}
                            />
                          </div>
                        </FieldBlock>

                        <FieldBlock
                          htmlFor="provider-base-url"
                          label="Base URL"
                          description="Use this when the provider should point at a custom API host or proxy."
                        >
                          <Input
                            id="provider-base-url"
                            value={draft.baseUrl}
                            disabled={isSaving}
                            placeholder="https://api.example.com/v1"
                            onChange={(event) => updateDraftField('baseUrl', event.target.value)}
                          />
                        </FieldBlock>

                        <FieldBlock
                          htmlFor="provider-chat-model"
                          label="Chat model"
                          description="This stores the provider-level chat model class name used by the backend."
                        >
                          <Input
                            id="provider-chat-model"
                            value={draft.chatModel}
                            disabled={isSaving}
                            placeholder="OpenAIChatModel"
                            onChange={(event) => updateDraftField('chatModel', event.target.value)}
                          />
                        </FieldBlock>

                        <FieldBlock
                          htmlFor="provider-generate-kwargs"
                          label="Generate kwargs"
                          description="Enter a JSON object for provider-level generation parameters such as temperature or max tokens."
                          error={parsedGenerateKwargs.error}
                        >
                          <textarea
                            id="provider-generate-kwargs"
                            aria-invalid={Boolean(parsedGenerateKwargs.error)}
                            value={draft.generateKwargsText}
                            disabled={isSaving}
                            placeholder={`{\n  "temperature": 0.7\n}`}
                            className="min-h-36 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                            onChange={(event) =>
                              updateDraftField('generateKwargsText', event.target.value)
                            }
                          />
                        </FieldBlock>
                      </div>

                      <Separator />

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{isSaving ? 'Saving' : 'Ready'}</Badge>
                          <Badge variant="outline">
                            {hasChanges ? 'Unsaved changes' : 'No local changes'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button disabled={!canSave} onClick={() => void saveSelectedProvider()}>
                            <SaveIcon data-icon="inline-start" />
                            Save provider config
                          </Button>

                          <Button
                            variant="outline"
                            disabled={!selectedProvider || isSaving || !hasChanges}
                            onClick={resetDraft}
                          >
                            <RefreshCcwIcon data-icon="inline-start" />
                            Reset draft
                          </Button>
                        </div>

                        <div className="rounded-lg border bg-background px-3 py-3 text-sm text-muted-foreground">
                          <p className="font-medium text-foreground">Save target</p>
                          <p className="mt-1 leading-6">
                            This pane writes provider-level settings to{' '}
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {modelProviderApiBaseUrl}/{selectedProvider.id}/config
                            </code>
                            .
                          </p>
                        </div>
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
