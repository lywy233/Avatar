export const selectedAgentIdStorageKey = 'avatar.settings.selected-agent-id'

export function readSelectedAgentId(): string {
  if (typeof window === 'undefined') {
    return 'default'
  }

  return window.localStorage.getItem(selectedAgentIdStorageKey)?.trim() || 'default'
}

export function persistSelectedAgentId(agentId: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(selectedAgentIdStorageKey, agentId)
  }
}
