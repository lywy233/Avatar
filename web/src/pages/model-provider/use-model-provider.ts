import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  activateModel as activateModelApi,
  addModelToProvider,
  createCustomProvider,
  deleteCustomProvider,
  deleteModelFromProvider,
  fetchActiveModel,
  fetchModelProviders,
  updateModelProviderConfig,
} from '@/pages/model-provider/api'
import {
  type ActiveModelInfo,
  type CreateCustomProviderInput,
  type ModelProviderConfigDraft,
  type ModelProviderInfo,
} from '@/pages/model-provider/types'

type UseModelProviderOptions = {
  onError: (title: string, message: string) => void
}

type JsonValidationResult = {
  value: Record<string, unknown>
  error: string | null
}

const EMPTY_DRAFT: ModelProviderConfigDraft = {
  apiKey: '',
  baseUrl: '',
  chatModel: '',
  generateKwargsText: '{}',
}

function formatJsonRecord(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2)
}

function createDraft(provider: ModelProviderInfo): ModelProviderConfigDraft {
  return {
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    chatModel: provider.chatModel,
    generateKwargsText: formatJsonRecord(provider.generateKwargs),
  }
}

function parseJsonRecord(value: string): JsonValidationResult {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return { value: {}, error: null }
  }

  try {
    const parsedValue = JSON.parse(trimmedValue) as unknown
    if (typeof parsedValue !== 'object' || parsedValue === null || Array.isArray(parsedValue)) {
      return {
        value: {},
        error: 'Generate kwargs must be a JSON object.',
      }
    }

    return {
      value: parsedValue as Record<string, unknown>,
      error: null,
    }
  } catch {
    return {
      value: {},
      error: 'Generate kwargs must be valid JSON.',
    }
  }
}

function normalizeText(value: string): string {
  return value.trim()
}

export function useModelProvider({ onError }: UseModelProviderOptions) {
  const [providers, setProviders] = useState<ModelProviderInfo[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ModelProviderConfigDraft>(EMPTY_DRAFT)
  const [isProvidersLoading, setIsProvidersLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingModel, setIsAddingModel] = useState(false)
  const [isDeletingModel, setIsDeletingModel] = useState(false)
  const [providersError, setProvidersError] = useState<string | null>(null)
  const [activeModel, setActiveModel] = useState<ActiveModelInfo | null>(null)
  const [isActiveModelLoading, setIsActiveModelLoading] = useState(false)

  const loadProviders = useCallback(
    async (signal?: AbortSignal) => {
      setIsProvidersLoading(true)
      setProvidersError(null)

      try {
        const nextProviders = await fetchModelProviders(signal, onError)
        setProviders(nextProviders)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        setProviders([])
        setProvidersError(
          error instanceof Error ? error.message : 'Failed to load the provider catalog.',
        )
      } finally {
        setIsProvidersLoading(false)
      }
    },
    [onError],
  )

  useEffect(() => {
    const controller = new AbortController()

    void loadProviders(controller.signal)

    return () => {
      controller.abort()
    }
  }, [loadProviders])

  const loadActiveModel = useCallback(
    async (signal?: AbortSignal) => {
      setIsActiveModelLoading(true)
      try {
        const model = await fetchActiveModel(signal, onError)
        setActiveModel(model)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        // Active model fetch failure is non-fatal; leave as null
      } finally {
        setIsActiveModelLoading(false)
      }
    },
    [onError],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadActiveModel(controller.signal)
    return () => controller.abort()
  }, [loadActiveModel])

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? null,
    [providers, selectedProviderId],
  )

  useEffect(() => {
    if (providers.length === 0) {
      setSelectedProviderId(null)
      return
    }

    if (selectedProviderId && providers.some((provider) => provider.id === selectedProviderId)) {
      return
    }

    setSelectedProviderId(providers[0].id)
  }, [providers, selectedProviderId])

  useEffect(() => {
    setDraft(selectedProvider ? createDraft(selectedProvider) : EMPTY_DRAFT)
  }, [selectedProvider])

  const parsedGenerateKwargs = useMemo(
    () => parseJsonRecord(draft.generateKwargsText),
    [draft.generateKwargsText],
  )

  const hasChanges = useMemo(() => {
    if (!selectedProvider || parsedGenerateKwargs.error) {
      return false
    }

    return (
      normalizeText(draft.apiKey) !== normalizeText(selectedProvider.apiKey) ||
      normalizeText(draft.baseUrl) !== normalizeText(selectedProvider.baseUrl) ||
      normalizeText(draft.chatModel) !== normalizeText(selectedProvider.chatModel) ||
      JSON.stringify(parsedGenerateKwargs.value) !== JSON.stringify(selectedProvider.generateKwargs)
    )
  }, [draft, parsedGenerateKwargs, selectedProvider])

  const canSave = Boolean(selectedProvider) && !isSaving && !parsedGenerateKwargs.error && hasChanges

  const updateDraftField = useCallback(
    (field: keyof ModelProviderConfigDraft, value: string) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        [field]: value,
      }))
    },
    [],
  )

  const resetDraft = useCallback(() => {
    if (!selectedProvider) {
      return
    }

    setDraft(createDraft(selectedProvider))
  }, [selectedProvider])

  const refreshAll = useCallback(async () => {
    await loadProviders()
  }, [loadProviders])

  const createCustomProviderHandler = useCallback(
    async (input: CreateCustomProviderInput) => {
      setIsCreating(true)
      try {
        await createCustomProvider(input, onError)
        await refreshAll()
      } catch {
        // Shared API helpers already surface the message through the error handler.
      } finally {
        setIsCreating(false)
      }
    },
    [onError, refreshAll],
  )

  const deleteCustomProviderHandler = useCallback(
    async (providerId: string) => {
      setIsDeleting(true)
      try {
        const remaining = await deleteCustomProvider(providerId, onError)
        setProviders(remaining)
        // If the deleted provider was selected, clear the selection
        if (selectedProviderId === providerId) {
          setSelectedProviderId(null)
        }
      } catch {
        // Shared API helpers already surface the message through the error handler.
      } finally {
        setIsDeleting(false)
      }
    },
    [onError, selectedProviderId],
  )

  const activateModelHandler = useCallback(
    async (providerId: string, modelId: string) => {
      try {
        const result = await activateModelApi({ providerId, model: modelId }, onError)
        setActiveModel(result)
      } catch {
        // Shared API helpers already surface the message through the error handler.
      }
    },
    [onError],
  )

  const addModelToProviderHandler = useCallback(
    async (providerId: string, input: { id: string; name: string }) => {
      setIsAddingModel(true)
      try {
        const updated = await addModelToProvider(providerId, input, onError)
        setProviders((currentProviders) =>
          currentProviders.map((p) => (p.id === updated.id ? updated : p)),
        )
      } catch {
        // Shared API helpers already surface the message through the error handler.
      } finally {
        setIsAddingModel(false)
      }
    },
    [onError],
  )

  const deleteModelFromProviderHandler = useCallback(
    async (providerId: string, modelId: string) => {
      setIsDeletingModel(true)
      try {
        const updated = await deleteModelFromProvider(providerId, modelId, onError)
        setProviders((currentProviders) =>
          currentProviders.map((p) => (p.id === updated.id ? updated : p)),
        )
      } catch {
        // Shared API helpers already surface the message through the error handler.
      } finally {
        setIsDeletingModel(false)
      }
    },
    [onError],
  )

  const saveSelectedProvider = useCallback(async () => {
    if (!selectedProvider || parsedGenerateKwargs.error) {
      return
    }

    setIsSaving(true)

    try {
      const nextProvider = await updateModelProviderConfig(
        selectedProvider.id,
        {
          apiKey: draft.apiKey,
          baseUrl: draft.baseUrl,
          chatModel: draft.chatModel,
          generateKwargs: parsedGenerateKwargs.value,
        },
        onError,
      )

      setProviders((currentProviders) =>
        currentProviders.map((provider) =>
          provider.id === nextProvider.id ? nextProvider : provider,
        ),
      )
    } catch {
      // Shared API helpers already surface the message through the error handler.
    } finally {
      setIsSaving(false)
    }
  }, [draft, onError, parsedGenerateKwargs, selectedProvider])

  return {
    providers,
    selectedProvider,
    selectedProviderId,
    setSelectedProviderId,
    draft,
    updateDraftField,
    resetDraft,
    isProvidersLoading,
    isSaving,
    isCreating,
    isDeleting,
    isAddingModel,
    isDeletingModel,
    providersError,
    parsedGenerateKwargs,
    hasChanges,
    canSave,
    refreshAll,
    saveSelectedProvider,
    createCustomProvider: createCustomProviderHandler,
    deleteCustomProvider: deleteCustomProviderHandler,
    addModel: addModelToProviderHandler,
    deleteModel: deleteModelFromProviderHandler,
    activeModel,
    isActiveModelLoading,
    activateModel: activateModelHandler,
  }
}
