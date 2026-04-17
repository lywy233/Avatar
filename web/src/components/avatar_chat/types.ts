/** Runtime status values mirrored from the local AgentScope runtime stream. */
export const AgentScopeRuntimeRunStatus = {
  Created: 'created',
  InProgress: 'in_progress',
  Completed: 'completed',
  Canceled: 'canceled',
  Failed: 'failed',
  Rejected: 'rejected',
  Unknown: 'unknown',
} as const

/** Runtime status union mirrored from the local AgentScope runtime stream. */
export type AgentScopeRuntimeRunStatus =
  (typeof AgentScopeRuntimeRunStatus)[keyof typeof AgentScopeRuntimeRunStatus]

/** Runtime message kinds emitted by the backend stream. */
export const AgentScopeRuntimeMessageType = {
  Message: 'message',
  Reasoning: 'reasoning',
  PluginCall: 'plugin_call',
  PluginCallOutput: 'plugin_call_output',
  FunctionCall: 'function_call',
  FunctionCallOutput: 'function_call_output',
  ComponentCall: 'component_call',
  ComponentCallOutput: 'component_call_output',
  McpListTools: 'mcp_list_tools',
  McpApprovalRequest: 'mcp_approval_request',
  McpApprovalResponse: 'mcp_approval_response',
  McpCall: 'mcp_call',
  McpCallOutput: 'mcp_call_output',
  Heartbeat: 'heartbeat',
  Error: 'error',
} as const

/** Runtime message type union emitted by the backend stream. */
export type AgentScopeRuntimeMessageType =
  (typeof AgentScopeRuntimeMessageType)[keyof typeof AgentScopeRuntimeMessageType]

/** Runtime content kinds supported by the local builder. */
export const AgentScopeRuntimeContentType = {
  Text: 'text',
  Data: 'data',
  Image: 'image',
  Audio: 'audio',
  Video: 'video',
  File: 'file',
  Refusal: 'refusal',
} as const

/** Runtime content type union supported by the local builder. */
export type AgentScopeRuntimeContentType =
  (typeof AgentScopeRuntimeContentType)[keyof typeof AgentScopeRuntimeContentType]

/** Shared shape for runtime content payloads. */
export interface AgentScopeRuntimeBaseContent {
  /** Content discriminator from the runtime stream. */
  type: string
  /** Runtime object marker. */
  object?: 'content'
  /** Whether the chunk is a streaming delta. */
  delta?: boolean | null
  /** Message id that this content belongs to. */
  msg_id?: string
  /** Runtime generation status for this content item. */
  status: AgentScopeRuntimeRunStatus
}

/** Text content emitted by the runtime. */
export interface AgentScopeRuntimeTextContent extends AgentScopeRuntimeBaseContent {
  /** Content discriminator. */
  type: typeof AgentScopeRuntimeContentType.Text
  /** Text body for the current chunk. */
  text: string
}

/** Image content emitted by the runtime. */
export interface AgentScopeRuntimeImageContent extends AgentScopeRuntimeBaseContent {
  /** Content discriminator. */
  type: typeof AgentScopeRuntimeContentType.Image
  /** Image URL rendered by the runtime UI. */
  image_url: string
}

/** Audio content emitted by the runtime. */
export interface AgentScopeRuntimeAudioContent extends AgentScopeRuntimeBaseContent {
  /** Content discriminator. */
  type: typeof AgentScopeRuntimeContentType.Audio
  /** Optional inline audio data. */
  data?: string
  /** URL for hosted audio content. */
  audio_url?: string
  /** Audio file format extension. */
  format?: string
}

/** Video content emitted by the runtime. */
export interface AgentScopeRuntimeVideoContent extends AgentScopeRuntimeBaseContent {
  /** Content discriminator. */
  type: typeof AgentScopeRuntimeContentType.Video
  /** Video URL rendered by the runtime UI. */
  video_url: string
  /** Optional poster image for the video. */
  video_poster?: string
}

/** File content emitted by the runtime. */
export interface AgentScopeRuntimeFileContent extends AgentScopeRuntimeBaseContent {
  /** Content discriminator. */
  type: typeof AgentScopeRuntimeContentType.File
  /** Runtime file id. */
  file_id?: string
  /** Download URL for the file. */
  file_url?: string
  /** Runtime file name. */
  file_name?: string
  /** Alternate file name field used by some payloads. */
  fileName?: string
  /** File size in bytes. */
  file_size?: number
}

/** Refusal content emitted by the runtime. */
export interface AgentScopeRuntimeRefusalContent extends AgentScopeRuntimeBaseContent {
  /** Content discriminator. */
  type: typeof AgentScopeRuntimeContentType.Refusal
  /** Refusal text returned by the model. */
  refusal: string
}

/** Arbitrary structured runtime content. */
export interface AgentScopeRuntimeDataContent<T = Record<string, unknown>>
  extends AgentScopeRuntimeBaseContent {
  /** Content discriminator. */
  type: typeof AgentScopeRuntimeContentType.Data
  /** Structured payload for tools and cards. */
  data: T
}

/** Union of runtime content payloads handled by the local UI. */
export type AgentScopeRuntimeContent =
  | AgentScopeRuntimeAudioContent
  | AgentScopeRuntimeDataContent
  | AgentScopeRuntimeFileContent
  | AgentScopeRuntimeImageContent
  | AgentScopeRuntimeRefusalContent
  | AgentScopeRuntimeTextContent
  | AgentScopeRuntimeVideoContent

/** Message shape used by the runtime response stream. */
export interface AgentScopeRuntimeMessage {
  /** Runtime message id. */
  id: string
  /** Runtime object marker. */
  object?: 'message'
  /** Message role such as user or assistant. */
  role: string
  /** Runtime message type. */
  type: AgentScopeRuntimeMessageType
  /** Content blocks attached to the message. */
  content: AgentScopeRuntimeContent[]
  /** Current runtime status for the message. */
  status: AgentScopeRuntimeRunStatus
  /** Optional error code attached to runtime failures. */
  code?: string
  /** Optional error message attached to runtime failures. */
  message?: string
}

/** Full response envelope emitted by the runtime stream. */
export interface AgentScopeRuntimeResponse {
  /** Runtime response id. */
  id: string
  /** Runtime object marker. */
  object?: 'response'
  /** Current runtime status for the full response. */
  status: AgentScopeRuntimeRunStatus
  /** Unix timestamp for creation time. */
  created_at: number
  /** Unix timestamp for completion time. */
  completed_at?: number
  /** Output messages produced by the runtime. */
  output: AgentScopeRuntimeMessage[]
  /** Optional token or usage metadata. */
  usage?: Record<string, unknown>
  /** Optional runtime error metadata. */
  error?: AgentScopeRuntimeError
}

/** Runtime error payload. */
export interface AgentScopeRuntimeError {
  /** Error code returned by the runtime. */
  code: string
  /** Human-readable error message. */
  message: string
}

/** Request message item sent back to the runtime endpoint. */
export interface AgentScopeRuntimeRequestInput {
  /** Optional id for previously generated assistant messages. */
  id?: string
  /** Optional runtime object marker. */
  object?: 'message'
  /** Role of the message in chat history. */
  role: string
  /** Message type sent to the runtime. */
  type: AgentScopeRuntimeMessageType
  /** Content blocks for the message. */
  content: AgentScopeRuntimeContent[]
  /** Optional status for previous assistant history items. */
  status?: AgentScopeRuntimeRunStatus
  /** Optional runtime error code. */
  code?: string
  /** Optional runtime error text. */
  message?: string
}

/** Runtime request body expected by the endpoint. */
export interface AgentScopeRuntimeRequestPayload {
  /** Flattened runtime history array. */
  input: AgentScopeRuntimeRequestInput[]
  /** Optional user prompt parameters supported by the runtime endpoint. */
  biz_params?: {
    /** Prompt parameter key-value pairs. */
    user_prompt_params?: Record<string, string>
  }
}

/** Supported UI-level chat statuses for local message rendering. */
export const AvatarChatMessageStatus = {
  Idle: 'idle',
  Generating: 'generating',
  Finished: 'finished',
  Interrupted: 'interrupted',
  Error: 'error',
} as const

/** Supported UI-level chat status union for local message rendering. */
export type AvatarChatMessageStatus =
  (typeof AvatarChatMessageStatus)[keyof typeof AvatarChatMessageStatus]

/** Local message model persisted in browser storage. */
export interface AvatarChatMessage {
  /** Stable local message id used for rendering and updates. */
  id: string
  /** Chat role rendered in the UI. */
  role: 'user' | 'assistant'
  /** Current local rendering status for the bubble. */
  status: AvatarChatMessageStatus
  /** Flattened markdown/text shown in the bubble. */
  text: string
  /** Unix timestamp for sort order and persistence. */
  createdAt: number
  /** User-side runtime request item used to rebuild history. */
  requestInput?: AgentScopeRuntimeRequestInput
  /** Assistant-side runtime response snapshot built from SSE chunks. */
  runtimeResponse?: AgentScopeRuntimeResponse
  /** Optional error string displayed for failed answers. */
  errorMessage?: string
}

/** Serialized single-session state written into localStorage. */
export interface AvatarChatPersistedState {
  /** Schema version for safe future migrations. */
  version: number
  /** Current local chat messages for the single persisted session. */
  messages: AvatarChatMessage[]
}

/** Parsed message emitted by the local SSE parser. */
export interface EventSourceMessage {
  /** Event id provided by the SSE stream. */
  id: string
  /** Event type provided by the SSE stream. */
  event: string
  /** Raw event data payload. */
  data: string
  /** Optional retry interval from the SSE stream. */
  retry?: number
}

/** Error-like payload used when building failed runtime responses locally. */
export interface AgentScopeRuntimeErrorMessageLike {
  /** Runtime object marker omitted by non-runtime failures. */
  object?: string
  /** Optional runtime message id. */
  id?: string
  /** Optional runtime message role. */
  role?: string
  /** Optional runtime message type. */
  type?: string
  /** Optional content collection. */
  content?: AgentScopeRuntimeContent[]
  /** Optional runtime status. */
  status?: AgentScopeRuntimeRunStatus
  /** Failure code shown to the user. */
  code?: string
  /** Failure message shown to the user. */
  message?: string
}
