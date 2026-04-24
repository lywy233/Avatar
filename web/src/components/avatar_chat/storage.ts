import type {
  AvatarChatMessage,
  AvatarChatPersistedState,
  AvatarChatSessionState,
} from '@/components/avatar_chat/types'

const STORAGE_KEY = 'avatar-chat-test-session'
const STORAGE_VERSION = 3

type LegacyAvatarChatPersistedState = {
  messages?: AvatarChatMessage[]
  sessionId?: string
  session_id?: string
}

/** Creates a fresh stable session id for the local chat playground. */
export function createAvatarChatSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `session_${crypto.randomUUID()}`
  }

  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function normalizeMessages(messages: AvatarChatMessage[]): AvatarChatMessage[] {
  return messages.map((message) => ({
    ...message,
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  }))
}

function resolveStoredSessionId(sessionId: unknown): string {
  if (typeof sessionId === 'string' && sessionId.trim()) {
    return sessionId
  }

  return createAvatarChatSessionId()
}

/** Restores the single local chat session from browser storage. */
export function readAvatarChatSession(): AvatarChatSessionState {
  if (typeof window === 'undefined') {
    return {
      sessionId: createAvatarChatSessionId(),
      messages: [],
    }
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)
  if (!rawValue) {
    return {
      sessionId: createAvatarChatSessionId(),
      messages: [],
    }
  }

  try {
    const parsed = JSON.parse(rawValue) as
      | AvatarChatPersistedState
      | LegacyAvatarChatPersistedState
      | AvatarChatMessage[]

    if (Array.isArray(parsed)) {
      return {
        sessionId: createAvatarChatSessionId(),
        messages: normalizeMessages(parsed),
      }
    }

    if (!Array.isArray(parsed.messages)) {
      return {
        sessionId: createAvatarChatSessionId(),
        messages: [],
      }
    }

    const legacySessionId = 'session_id' in parsed ? parsed.session_id : undefined

    return {
      sessionId: resolveStoredSessionId(parsed.sessionId ?? legacySessionId),
      messages: normalizeMessages(parsed.messages),
    }
  } catch {
    return {
      sessionId: createAvatarChatSessionId(),
      messages: [],
    }
  }
}

/** Persists the current local chat session into browser storage. */
export function writeAvatarChatSession(session: AvatarChatSessionState): void {
  if (typeof window === 'undefined') {
    return
  }

  const payload: AvatarChatPersistedState = {
    version: STORAGE_VERSION,
    sessionId: session.sessionId,
    messages: session.messages,
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage quota/security failures so chat rendering can continue.
  }
}
