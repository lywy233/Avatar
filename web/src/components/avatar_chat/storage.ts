import type {
  AvatarChatMessage,
  AvatarChatPersistedState,
} from '@/components/avatar_chat/types'

const STORAGE_KEY = 'avatar-chat-test-session'
const STORAGE_VERSION = 1

/** Restores the single local chat session from browser storage. */
export function readAvatarChatSession(): AvatarChatMessage[] {
  if (typeof window === 'undefined') {
    return []
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)
  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as AvatarChatPersistedState
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.messages)) {
      return []
    }

    return parsed.messages
  } catch {
    return []
  }
}

/** Persists the current local chat session into browser storage. */
export function writeAvatarChatSession(messages: AvatarChatMessage[]): void {
  if (typeof window === 'undefined') {
    return
  }

  const payload: AvatarChatPersistedState = {
    version: STORAGE_VERSION,
    messages,
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage quota/security failures so chat rendering can continue.
  }
}
