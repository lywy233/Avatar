import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  AgentScopeRuntimeResponseBuilder,
  buildFailedRuntimeResponse,
  buildHistoryInput,
  buildUserRequestInput,
  consumeSseStream,
  createLocalMessageId,
  extractErrorMessageFromRuntimeResponse,
  extractMarkdownFromRuntimeResponse,
  finalizeRuntimeResponse,
  mapRuntimeStatusToMessageStatus,
  mergeToolMessages,
} from '@/components/avatar_chat/runtime'
import {
  createAvatarChatSessionId,
  readAvatarChatSession,
  writeAvatarChatSession,
} from '@/components/avatar_chat/storage'
import {
  type AgentScopeRuntimeRequestPayload,
  type AgentScopeRuntimeResponse,
  AgentScopeRuntimeRunStatus,
  type AvatarChatAttachment,
  type AvatarChatMessage,
  AvatarChatMessageStatus,
} from '@/components/avatar_chat/types'
import { authFetch } from '@/lib/auth-api'
import { deleteMediaFile, uploadMediaFile } from '@/lib/file-system-api'

type PendingAvatarChatAttachment = {
  id: string
  file: File
  name: string
  size: number
  contentType: string
  mediaKind: AvatarChatAttachment['mediaKind']
  previewUrl: string
}

const MAX_LENGTH = 4000

const WELCOME_PROMPTS = [
  { value: 'Summarize what this Avatar app does.' },
  { value: 'Explain the current frontend structure.' },
  { value: 'What routes are available in this project?' },
] as const

/** Configuration copied from the current `/chat` route contract. */
export const avatarChatContract = {
  endpoint: import.meta.env.VITE_AGENT_API_BASE_URL ?? '/api/agent/process',
  maxLength: MAX_LENGTH,
  placeholder: 'Ask Avatar anything…',
  disclaimer:
    'Responses may be imperfect. Verify important details before relying on them.',
  welcome: {
    greeting: 'Chat with Avatar',
    nick: 'Avatar',
    description: 'AgentScope Runtime powers the chat surface for this frontend route.',
    prompts: WELCOME_PROMPTS,
  },
} as const

/** Request helper that preserves the existing `/chat` network and API error semantics. */
export function createErrorHandlingFetch(
  endpoint: string,
  onError: (title: string, message: string) => void,
) {
  return async (payload: AgentScopeRuntimeRequestPayload, signal?: AbortSignal): Promise<Response> => {
    let response: Response

    try {
      response = await authFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      })
    } catch (networkError) {
      if (networkError instanceof DOMException && networkError.name === 'AbortError') {
        throw networkError
      }

      const message =
        networkError instanceof Error ? networkError.message : 'Network error'
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
          }
          if (errorData.error) {
            errorMessage =
              typeof errorData.error === 'string'
                ? errorData.error
                : errorData.error.message || JSON.stringify(errorData.error)
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

    return response
  }
}

type UseAvatarChatOptions = {
  /** Runtime endpoint used by the local chat page. */
  endpoint: string
  /** Error callback shared with the app-level error dialog provider. */
  onError: (title: string, message: string) => void
}

/** Local chat controller for `/ChatTest` using SSE parsing and runtime response building. */
export function useAvatarChat({ endpoint, onError }: UseAvatarChatOptions) {
  const initialSessionState = useMemo(() => readAvatarChatSession(), [])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAvatarChatAttachment[]>([])
  const [sessionId, setSessionId] = useState(initialSessionState.sessionId)
  const [messages, setMessages] = useState<AvatarChatMessage[]>(() =>
    initialSessionState.messages.map((message) => {
      if (message.status === AvatarChatMessageStatus.Generating) {
        return {
          ...message,
          status: AvatarChatMessageStatus.Interrupted,
        }
      }

      return message
    }),
  )

  const messagesRef = useRef(messages)
  const pendingAttachmentsRef = useRef<PendingAvatarChatAttachment[]>([])
  const sessionIdRef = useRef(sessionId)
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeAssistantIdRef = useRef<string | null>(null)
  const responseBuilderRef = useRef<AgentScopeRuntimeResponseBuilder | null>(null)
  const requestRuntime = useMemo(
    () => createErrorHandlingFetch(endpoint, onError),
    [endpoint, onError],
  )

  useEffect(() => {
    messagesRef.current = messages
    writeAvatarChatSession({ sessionId, messages })
  }, [messages, sessionId])

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments
  }, [pendingAttachments])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl)
      })
    }
  }, [])

  const lastAssistantMessage = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'assistant') {
        return messages[index]
      }
    }

    return undefined
  }, [messages])

  const canRegenerate = Boolean(lastAssistantMessage) && !isLoading

  const updateMessages = useCallback((nextMessages: AvatarChatMessage[]) => {
    messagesRef.current = nextMessages
    setMessages(nextMessages)
  }, [])

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return
      }

      const nextAttachments = files.map((file) => ({
        id: createLocalMessageId(),
        file,
        name: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        mediaKind: classifyPendingMediaKind(file.type),
        previewUrl: URL.createObjectURL(file),
      }))

      setPendingAttachments((currentAttachments) => [
        ...currentAttachments,
        ...nextAttachments,
      ])
    },
    [],
  )

  const removePendingAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((currentAttachments) => {
      const attachmentToRemove = currentAttachments.find(
        (attachment) => attachment.id === attachmentId,
      )
      if (attachmentToRemove) {
        URL.revokeObjectURL(attachmentToRemove.previewUrl)
      }

      return currentAttachments.filter((attachment) => attachment.id !== attachmentId)
    })
  }, [])

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((currentAttachments) => {
      currentAttachments.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl)
      })

      return []
    })
  }, [])

  const updateAssistantMessage = useCallback(
    (
      assistantId: string,
      updater: (message: AvatarChatMessage) => AvatarChatMessage,
    ) => {
      const nextMessages = messagesRef.current.map((message) => {
        if (message.id !== assistantId) {
          return message
        }

        return updater(message)
      })

      updateMessages(nextMessages)
    },
    [updateMessages],
  )

  const finishRequest = useCallback((controller?: AbortController | null) => {
    if (controller && abortControllerRef.current !== controller) {
      return
    }

    abortControllerRef.current = null
    activeAssistantIdRef.current = null
    responseBuilderRef.current = null
    setIsLoading(false)
  }, [])

  const streamAssistantResponse = useCallback(
    async (snapshotMessages: AvatarChatMessage[], assistantId: string) => {
      const controller = new AbortController()
      const builder = new AgentScopeRuntimeResponseBuilder({
        id: createLocalMessageId(),
        status: AgentScopeRuntimeRunStatus.Created,
        created_at: Date.now(),
      })

      abortControllerRef.current = controller
      activeAssistantIdRef.current = assistantId
      responseBuilderRef.current = builder
      setIsLoading(true)

      try {
        const response = await requestRuntime(
          {
            input: buildHistoryInput(snapshotMessages),
            session_id: sessionIdRef.current,
          },
          controller.signal,
        )

        if (!response.body) {
          const finalizedResponse = finalizeRuntimeResponse(builder.data)
          updateAssistantMessage(assistantId, (message) => ({
            ...message,
            runtimeResponse: finalizedResponse,
            text: extractMarkdownFromRuntimeResponse(finalizedResponse),
            status: mapRuntimeStatusToMessageStatus(finalizedResponse.status),
          }))
          finishRequest(controller)
          return
        }

        await consumeSseStream(response.body, (sseMessage) => {
          if (controller.signal.aborted) {
            return
          }

          if (sseMessage.event && sseMessage.event !== 'message') {
            return
          }

          if (!sseMessage.data.trim()) {
            return
          }

          let parsedChunk: AgentScopeRuntimeResponse
          try {
            parsedChunk = JSON.parse(sseMessage.data) as AgentScopeRuntimeResponse
          } catch {
            throw new Error('Invalid SSE payload received from the runtime endpoint.')
          }

          const runtimeResponse = builder.handle(parsedChunk)
          const mergedResponse = {
            ...runtimeResponse,
            output: mergeToolMessages(runtimeResponse.output),
          }

          updateAssistantMessage(assistantId, (message) => ({
            ...message,
            runtimeResponse: mergedResponse,
            text: extractMarkdownFromRuntimeResponse(mergedResponse),
            status: mapRuntimeStatusToMessageStatus(mergedResponse.status),
            errorMessage: extractErrorMessageFromRuntimeResponse(mergedResponse),
          }))
        })

        if (controller.signal.aborted) {
          return
        }

        const finalizedResponse = finalizeRuntimeResponse({
          ...builder.data,
          output: mergeToolMessages(builder.data.output),
        })

        updateAssistantMessage(assistantId, (message) => ({
          ...message,
          runtimeResponse: finalizedResponse,
          text: extractMarkdownFromRuntimeResponse(finalizedResponse),
          status: mapRuntimeStatusToMessageStatus(finalizedResponse.status),
          errorMessage: extractErrorMessageFromRuntimeResponse(finalizedResponse),
        }))
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Unexpected request failure'
        const failedResponse = buildFailedRuntimeResponse(errorMessage)

        updateAssistantMessage(assistantId, (message) => ({
          ...message,
          runtimeResponse: failedResponse,
          text: extractMarkdownFromRuntimeResponse(failedResponse),
          status: AvatarChatMessageStatus.Error,
          errorMessage,
        }))
      } finally {
        finishRequest(controller)
      }
    },
    [finishRequest, requestRuntime, updateAssistantMessage],
  )

  const submit = useCallback(
    async (nextQuery?: string) => {
      if (isLoading || isUploading) {
        return
      }

      const query = (nextQuery ?? draft).trim()
      const attachments = pendingAttachments

      if (!query && attachments.length === 0) {
        return
      }

      const uploadedAttachments: AvatarChatAttachment[] = []

      try {
        setIsUploading(true)

        for (const attachment of attachments) {
          uploadedAttachments.push(await uploadMediaFile(attachment.file, onError))
        }
        const userMessage: AvatarChatMessage = {
          id: createLocalMessageId(),
          role: 'user',
          status: AvatarChatMessageStatus.Finished,
          text: query,
          createdAt: Date.now(),
          attachments: uploadedAttachments,
          requestInput: buildUserRequestInput(query, uploadedAttachments),
        }

        const assistantMessage: AvatarChatMessage = {
          id: createLocalMessageId(),
          role: 'assistant',
          status: AvatarChatMessageStatus.Generating,
          text: '',
          createdAt: Date.now(),
        }

        const nextMessages = [...messagesRef.current, userMessage, assistantMessage]
        updateMessages(nextMessages)
        attachments.forEach((attachment) => {
          URL.revokeObjectURL(attachment.previewUrl)
        })
        setDraft('')
        setPendingAttachments([])
        setIsUploading(false)

        await streamAssistantResponse(nextMessages, assistantMessage.id)
      } catch (error) {
        if (uploadedAttachments.length > 0) {
          await Promise.allSettled(
            uploadedAttachments.map((attachment) => deleteMediaFile(attachment.relativePath)),
          )
        }

        setIsUploading(false)
        throw error
      }
    },
    [
      draft,
      isLoading,
      isUploading,
      onError,
      pendingAttachments,
      streamAssistantResponse,
      updateMessages,
    ],
  )

  const stop = useCallback(() => {
    const assistantId = activeAssistantIdRef.current
    const builder = responseBuilderRef.current

    abortControllerRef.current?.abort()

    if (!assistantId) {
      finishRequest()
      return
    }

    const canceledResponse = builder
      ? {
          ...builder.cancel(),
          output: mergeToolMessages(builder.data.output),
        }
      : undefined

    updateAssistantMessage(assistantId, (message) => ({
      ...message,
      runtimeResponse: canceledResponse,
      text:
        extractMarkdownFromRuntimeResponse(canceledResponse) ||
        message.text ||
        'Generation stopped.',
      status: AvatarChatMessageStatus.Interrupted,
      errorMessage: undefined,
    }))

    finishRequest()
  }, [finishRequest, updateAssistantMessage])

  const regenerate = useCallback(async () => {
    if (isLoading) {
      return
    }

    const currentMessages = messagesRef.current
    let assistantIndex = -1

    for (let index = currentMessages.length - 1; index >= 0; index -= 1) {
      if (currentMessages[index].role === 'assistant') {
        assistantIndex = index
        break
      }
    }

    if (assistantIndex <= 0) {
      return
    }

    const nextAssistantMessage: AvatarChatMessage = {
      id: createLocalMessageId(),
      role: 'assistant',
      status: AvatarChatMessageStatus.Generating,
      text: '',
      createdAt: Date.now(),
    }

    const nextMessages = [
      ...currentMessages.slice(0, assistantIndex),
      nextAssistantMessage,
    ]

    updateMessages(nextMessages)
    await streamAssistantResponse(nextMessages, nextAssistantMessage.id)
  }, [isLoading, streamAssistantResponse, updateMessages])

  const startNewConversation = useCallback(() => {
    abortControllerRef.current?.abort()

    const nextSessionId = createAvatarChatSessionId()
    sessionIdRef.current = nextSessionId

    clearPendingAttachments()
    setDraft('')
    updateMessages([])
    setSessionId(nextSessionId)
    finishRequest()
  }, [clearPendingAttachments, finishRequest, updateMessages])

  const remainingCharacters = avatarChatContract.maxLength - draft.length

  return {
    canRegenerate,
    draft,
    isUploading,
    isLoading,
    lastAssistantMessageId: lastAssistantMessage?.id,
    messages,
    pendingAttachments,
    remainingCharacters,
    removePendingAttachment,
    setDraft,
    startNewConversation,
    stop,
    submit,
    uploadFiles,
    regenerate,
  }
}

function classifyPendingMediaKind(contentType: string): AvatarChatAttachment['mediaKind'] {
  if (contentType.startsWith('image/')) {
    return 'image'
  }
  if (contentType.startsWith('audio/')) {
    return 'audio'
  }
  if (contentType.startsWith('video/')) {
    return 'video'
  }
  return 'file'
}
