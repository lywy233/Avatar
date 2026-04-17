import {
  AgentScopeRuntimeContentType,
  type AgentScopeRuntimeErrorMessageLike,
  type AgentScopeRuntimeContent,
  type AgentScopeRuntimeDataContent,
  type AgentScopeRuntimeImageContent,
  type AgentScopeRuntimeMessage,
  AgentScopeRuntimeMessageType,
  type AgentScopeRuntimeRequestInput,
  type AgentScopeRuntimeResponse,
  AgentScopeRuntimeRunStatus,
  type AgentScopeRuntimeTextContent,
  type AvatarChatMessage,
  AvatarChatMessageStatus,
  type EventSourceMessage,
} from '@/components/avatar_chat/types'

const HEARTBEAT_MESSAGE_TYPES = new Set<AgentScopeRuntimeMessageType>([
  AgentScopeRuntimeMessageType.Heartbeat,
])

const TOOL_INPUT_MESSAGE_TYPES = new Set<AgentScopeRuntimeMessageType>([
  AgentScopeRuntimeMessageType.FunctionCall,
  AgentScopeRuntimeMessageType.PluginCall,
  AgentScopeRuntimeMessageType.ComponentCall,
  AgentScopeRuntimeMessageType.McpCall,
])

const TOOL_OUTPUT_MESSAGE_TYPES = new Set<AgentScopeRuntimeMessageType>([
  AgentScopeRuntimeMessageType.FunctionCallOutput,
  AgentScopeRuntimeMessageType.PluginCallOutput,
  AgentScopeRuntimeMessageType.ComponentCallOutput,
  AgentScopeRuntimeMessageType.McpCallOutput,
])

const CONTROL_CHARS = {
  CarriageReturn: 13,
  Colon: 58,
  NewLine: 10,
  Space: 32,
} as const

/** Creates a stable local id for persisted messages and placeholders. */
export function createLocalMessageId(): string {
  return crypto.randomUUID()
}

/** Builds the user request item that matches the existing runtime input contract. */
export function buildUserRequestInput(query: string): AgentScopeRuntimeRequestInput {
  return {
    role: 'user',
    type: AgentScopeRuntimeMessageType.Message,
    content: [
      {
        type: AgentScopeRuntimeContentType.Text,
        text: query,
        status: AgentScopeRuntimeRunStatus.Created,
      },
    ],
  }
}

/** Rebuilds the runtime history payload the same way the reference request builder does. */
export function buildHistoryInput(messages: AvatarChatMessage[]): AgentScopeRuntimeRequestInput[] {
  return messages.reduce<AgentScopeRuntimeRequestInput[]>((history, message) => {
    if (message.requestInput) {
      history.push(message.requestInput)
      return history
    }

    if (message.runtimeResponse?.output?.length) {
      history.push(...message.runtimeResponse.output)
    }

    return history
  }, [])
}

/** Converts runtime statuses into simple UI statuses for the local chat bubbles. */
export function mapRuntimeStatusToMessageStatus(
  status: AgentScopeRuntimeRunStatus,
): AvatarChatMessageStatus {
  if (
    status === AgentScopeRuntimeRunStatus.Created ||
    status === AgentScopeRuntimeRunStatus.InProgress
  ) {
    return AvatarChatMessageStatus.Generating
  }

  if (status === AgentScopeRuntimeRunStatus.Canceled) {
    return AvatarChatMessageStatus.Interrupted
  }

  if (
    status === AgentScopeRuntimeRunStatus.Failed ||
    status === AgentScopeRuntimeRunStatus.Rejected
  ) {
    return AvatarChatMessageStatus.Error
  }

  return AvatarChatMessageStatus.Finished
}

/** Extracts markdown text from the runtime response for local rendering. */
export function extractMarkdownFromRuntimeResponse(
  response: AgentScopeRuntimeResponse | undefined,
): string {
  if (!response) {
    return ''
  }

  const segments: string[] = []

  normalizeOutput(response.output).forEach((message) => {
    if (
      message.type !== AgentScopeRuntimeMessageType.Message &&
      message.type !== AgentScopeRuntimeMessageType.Error
    ) {
      return
    }

    if (message.type === AgentScopeRuntimeMessageType.Error && message.message) {
      segments.push(message.message)
      return
    }

    normalizeContent(message.content).forEach((content) => {
      if (content.type === AgentScopeRuntimeContentType.Text) {
        const textContent = content as AgentScopeRuntimeTextContent
        if (textContent.text) {
          segments.push(textContent.text)
        }
      }

      if (content.type === AgentScopeRuntimeContentType.Refusal && 'refusal' in content) {
        segments.push(content.refusal)
      }
    })
  })

  return segments.join('\n\n').trim()
}

/** Extracts the most useful error string from a runtime response. */
export function extractErrorMessageFromRuntimeResponse(
  response: AgentScopeRuntimeResponse | undefined,
): string | undefined {
  if (!response) {
    return undefined
  }

  const failedMessage = response.output.find(
    (message) => message.type === AgentScopeRuntimeMessageType.Error,
  )

  return failedMessage?.message ?? response.error?.message
}

/** Marks a partially built response as locally completed when the stream closes cleanly. */
export function finalizeRuntimeResponse(
  response: AgentScopeRuntimeResponse,
): AgentScopeRuntimeResponse {
  if (
    response.status === AgentScopeRuntimeRunStatus.Created ||
    response.status === AgentScopeRuntimeRunStatus.InProgress
  ) {
      return {
        ...response,
        status: AgentScopeRuntimeRunStatus.Completed,
        completed_at: Date.now(),
        output: normalizeOutput(response.output).map((message) => ({
          ...message,
          status:
            message.status === AgentScopeRuntimeRunStatus.Created ||
            message.status === AgentScopeRuntimeRunStatus.InProgress
              ? AgentScopeRuntimeRunStatus.Completed
              : message.status,
          content: normalizeContent(message.content).map((content) => ({
            ...content,
            status:
              content.status === AgentScopeRuntimeRunStatus.Created ||
              content.status === AgentScopeRuntimeRunStatus.InProgress
                ? AgentScopeRuntimeRunStatus.Completed
              : content.status,
        })),
      })),
    }
  }

  return response
}

/** Creates a failed runtime response for transport-level failures outside SSE. */
export function buildFailedRuntimeResponse(message: string): AgentScopeRuntimeResponse {
  const builder = new AgentScopeRuntimeResponseBuilder({
    id: createLocalMessageId(),
    status: AgentScopeRuntimeRunStatus.Failed,
    created_at: Date.now(),
  })

  return builder.handle({
    code: 'request_error',
    message,
  })
}

/** Consumes a readable SSE stream using the same parsing strategy as the reference code. */
export async function consumeSseStream(
  stream: ReadableStream<Uint8Array>,
  onMessage: (message: EventSourceMessage) => void,
): Promise<void> {
  await getBytes(
    stream,
    getLines(
      getMessages(
        () => undefined,
        () => undefined,
        onMessage,
      ),
    ),
  )
}

/** Mirrors the reference runtime response builder to merge streamed runtime chunks locally. */
export class AgentScopeRuntimeResponseBuilder {
  data: AgentScopeRuntimeResponse

  constructor({
    id,
    status,
    created_at,
  }: Pick<AgentScopeRuntimeResponse, 'created_at' | 'id' | 'status'>) {
    this.data = {
      id,
      output: [],
      object: 'response',
      status,
      created_at,
    }
  }

  handleResponse(data: AgentScopeRuntimeResponse): void {
    this.data = {
      ...this.data,
      ...data,
      output: normalizeOutput(data.output),
    }
  }

  handleMessage(data: AgentScopeRuntimeMessage): void {
    const existingIndex = this.data.output.findIndex((message) => message.id === data.id)
    const normalizedContent = normalizeContent(data.content)

    if (existingIndex >= 0) {
      const existingMessage = this.data.output[existingIndex]
      const nextContent =
        normalizedContent.length > 0
          ? normalizedContent
          : normalizeContent(existingMessage.content)

      this.data = {
        ...this.data,
        output: this.data.output.map((message, index) => {
          if (index !== existingIndex) {
            return message
          }

          return {
            ...existingMessage,
            ...data,
            content: nextContent,
          }
        }),
      }

      return
    }

    this.data = {
      ...this.data,
      output: [...this.data.output, { ...data, content: normalizedContent }],
    }
  }

  handleContent(data: AgentScopeRuntimeContent): void {
    const messageId = data.msg_id
    if (!messageId) {
      return
    }

    this.data = {
      ...this.data,
      output: this.data.output.map((message) => {
        if (message.id !== messageId) {
          return message
        }

        const nextContent = [...normalizeContent(message.content)]

        if (data.delta) {
          const lastContent = nextContent[nextContent.length - 1]

          if (lastContent && lastContent.delta) {
            if (
              data.type === AgentScopeRuntimeContentType.Text &&
              lastContent.type === AgentScopeRuntimeContentType.Text
            ) {
              ;(lastContent as AgentScopeRuntimeTextContent).text += (
                data as AgentScopeRuntimeTextContent
              ).text
            } else if (data.type === AgentScopeRuntimeContentType.Image) {
              ;(lastContent as AgentScopeRuntimeImageContent).image_url = (
                data as AgentScopeRuntimeImageContent
              ).image_url
            } else if (data.type === AgentScopeRuntimeContentType.Data) {
              ;(lastContent as AgentScopeRuntimeDataContent).data = (
                data as AgentScopeRuntimeDataContent
              ).data
            }
          } else {
            nextContent.push(data)
          }
        } else if (nextContent.length > 0) {
          nextContent[nextContent.length - 1] = {
            ...nextContent[nextContent.length - 1],
            ...data,
          } as AgentScopeRuntimeContent
        } else {
          nextContent.push(data)
        }

        return {
          ...message,
          content: nextContent,
        }
      }),
    }
  }

  handleError(data: AgentScopeRuntimeErrorMessageLike): void {
    this.data = {
      ...this.data,
      status: AgentScopeRuntimeRunStatus.Failed,
      output: [
        ...this.data.output,
        {
          status: AgentScopeRuntimeRunStatus.Failed,
          type: AgentScopeRuntimeMessageType.Error,
          content: [],
          id: data.id ?? createLocalMessageId(),
          role: data.role ?? 'assistant',
          code: data.code,
          message:
            typeof data.message === 'string'
              ? data.message
              : JSON.stringify(data.message ?? 'Unknown error'),
        },
      ],
    }
  }

  handle(
    data: AgentScopeRuntimeContent | AgentScopeRuntimeErrorMessageLike | AgentScopeRuntimeMessage | AgentScopeRuntimeResponse,
  ): AgentScopeRuntimeResponse {
    if (data.object === 'response') {
      this.handleResponse(data as AgentScopeRuntimeResponse)
      return this.data
    }

    if (data.object === 'message') {
      if (HEARTBEAT_MESSAGE_TYPES.has(data.type as AgentScopeRuntimeMessageType)) {
        return this.data
      }

      this.handleMessage(data as AgentScopeRuntimeMessage)
      return this.data
    }

    if (data.object === 'content') {
      this.handleContent(data as AgentScopeRuntimeContent)
      return this.data
    }

    this.handleError(data as AgentScopeRuntimeErrorMessageLike)
    return this.data
  }

  cancel(): AgentScopeRuntimeResponse {
    this.data = {
      ...this.data,
      status:
        this.data.status === AgentScopeRuntimeRunStatus.Created ||
        this.data.status === AgentScopeRuntimeRunStatus.InProgress
          ? AgentScopeRuntimeRunStatus.Canceled
          : this.data.status,
      output: this.data.output.map((message) => ({
        ...message,
        status:
          message.status === AgentScopeRuntimeRunStatus.Created ||
          message.status === AgentScopeRuntimeRunStatus.InProgress
            ? AgentScopeRuntimeRunStatus.Canceled
            : message.status,
        content: normalizeContent(message.content).map((content) => ({
          ...content,
          status:
            content.status === AgentScopeRuntimeRunStatus.Created ||
            content.status === AgentScopeRuntimeRunStatus.InProgress
              ? AgentScopeRuntimeRunStatus.Canceled
              : content.status,
        })),
      })),
    }

    return this.data
  }
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length)
  result.set(a)
  result.set(b, a.length)
  return result
}

async function getBytes(
  stream: ReadableStream<Uint8Array>,
  onChunk: (arr: Uint8Array) => void,
): Promise<void> {
  const reader = stream.getReader()
  let result: ReadableStreamReadResult<Uint8Array>

  while (!(result = await reader.read()).done) {
    onChunk(result.value)
  }
}

function getLines(onLine: (line: Uint8Array, fieldLength: number) => void) {
  let buffer: Uint8Array | undefined
  let position = 0
  let fieldLength = -1
  let discardTrailingNewline = false

  return (arr: Uint8Array) => {
    if (buffer === undefined) {
      buffer = arr
      position = 0
      fieldLength = -1
    } else {
      buffer = concat(buffer, arr)
    }

    const bufferLength = buffer.length
    let lineStart = 0

    while (position < bufferLength) {
      if (discardTrailingNewline) {
        if (buffer[position] === CONTROL_CHARS.NewLine) {
          lineStart = ++position
        }

        discardTrailingNewline = false
      }

      let lineEnd = -1
      for (; position < bufferLength && lineEnd === -1; position += 1) {
        switch (buffer[position]) {
          case CONTROL_CHARS.Colon:
            if (fieldLength === -1) {
              fieldLength = position - lineStart
            }
            break
          case CONTROL_CHARS.CarriageReturn:
            discardTrailingNewline = true
            lineEnd = position
            break
          case CONTROL_CHARS.NewLine:
            lineEnd = position
            break
        }
      }

      if (lineEnd === -1) {
        break
      }

      onLine(buffer.subarray(lineStart, lineEnd), fieldLength)
      lineStart = position
      fieldLength = -1
    }

    if (lineStart === bufferLength) {
      buffer = undefined
    } else if (lineStart !== 0) {
      buffer = buffer.subarray(lineStart)
      position -= lineStart
    }
  }
}

function getMessages(
  onId: (id: string) => void,
  onRetry: (retry: number) => void,
  onMessage?: (message: EventSourceMessage) => void,
) {
  let message = newMessage()
  const decoder = new TextDecoder()

  return (line: Uint8Array, fieldLength: number) => {
    if (line.length === 0) {
      onMessage?.(message)
      message = newMessage()
      return
    }

    if (fieldLength <= 0) {
      return
    }

    const field = decoder.decode(line.subarray(0, fieldLength))
    const valueOffset =
      fieldLength + (line[fieldLength + 1] === CONTROL_CHARS.Space ? 2 : 1)
    const value = decoder.decode(line.subarray(valueOffset))

    switch (field) {
      case 'data':
        message.data = message.data ? `${message.data}\n${value}` : value
        break
      case 'event':
        message.event = value
        break
      case 'id':
        message.id = value
        onId(value)
        break
      case 'retry': {
        const retry = Number.parseInt(value, 10)
        if (!Number.isNaN(retry)) {
          message.retry = retry
          onRetry(retry)
        }
        break
      }
    }
  }
}

function newMessage(): EventSourceMessage {
  return {
    data: '',
    event: '',
    id: '',
    retry: undefined,
  }
}

/** Merges tool input/output pairs the same way the reference card layer does. */
export function mergeToolMessages(
  messages: AgentScopeRuntimeMessage[],
): AgentScopeRuntimeMessage[] {
  const bufferMessagesMap = new Map<string, AgentScopeRuntimeDataContent>()
  let resultMessages: AgentScopeRuntimeMessage[] = []

  normalizeOutput(messages).forEach((message) => {
    const normalizedContent = normalizeContent(message.content)

    if (TOOL_INPUT_MESSAGE_TYPES.has(message.type) && normalizedContent.length > 0) {
      const content = normalizedContent[0] as AgentScopeRuntimeDataContent<{
        call_id?: string
        name: string
      }>
      const key = content.data.call_id || content.data.name
      bufferMessagesMap.set(key, content)
      resultMessages.push({ ...message, content: normalizedContent })
      return
    }

    if (TOOL_OUTPUT_MESSAGE_TYPES.has(message.type) && normalizedContent.length > 0) {
      const content = normalizedContent[0] as AgentScopeRuntimeDataContent<{
        call_id?: string
        name: string
      }>
      const key = content.data.call_id || content.data.name

      if (bufferMessagesMap.has(key)) {
        resultMessages = resultMessages.map((existingMessage) => {
          if (!TOOL_INPUT_MESSAGE_TYPES.has(existingMessage.type)) {
            return existingMessage
          }

          const existingContent = normalizeContent(existingMessage.content)[0] as AgentScopeRuntimeDataContent<{
            call_id?: string
            name: string
          }>
          const existingKey = existingContent.data.call_id || existingContent.data.name

          if (existingKey === key) {
              return {
                ...message,
                content: [...normalizeContent(existingMessage.content), content],
              }
            }

          return existingMessage
        })
        return
      }
    }

    resultMessages.push({ ...message, content: normalizedContent })
  })

  return resultMessages
}

function normalizeOutput(
  output: AgentScopeRuntimeResponse['output'] | AgentScopeRuntimeMessage[] | null | undefined,
): AgentScopeRuntimeMessage[] {
  return Array.isArray(output)
    ? output.map((message) => ({
        ...message,
        content: normalizeContent(message.content),
      }))
    : []
}

function normalizeContent(
  content: AgentScopeRuntimeMessage['content'] | AgentScopeRuntimeContent[] | null | undefined,
): AgentScopeRuntimeContent[] {
  return Array.isArray(content) ? content : []
}
