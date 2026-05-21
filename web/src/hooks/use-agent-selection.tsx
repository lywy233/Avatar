import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useErrorHandler } from '@/hooks/use-error-handler'
import {
  persistSelectedAgentId,
  readSelectedAgentId,
} from '@/lib/agent-selection'
import { fetchUserConfig } from '@/pages/settings/api'

type JsonRecord = Record<string, unknown>

type AgentSelectionContextValue = {
  agentIds: string[]
  isLoading: boolean
  refreshAgentCatalog: (config?: JsonRecord, signal?: AbortSignal) => Promise<string[]>
  selectedAgentId: string
  setSelectedAgentId: (agentId: string) => void
}

const AgentSelectionContext = createContext<AgentSelectionContextValue | null>(null)

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function extractAgentIds(config: JsonRecord, currentAgentId: string): string[] {
  const profiles = isRecord(config.agents) && isRecord(config.agents.profiles)
    ? config.agents.profiles
    : {}

  const profileAgentIds = Object.keys(profiles)
  const nextAgentIds = new Set<string>(['default', currentAgentId, ...profileAgentIds].filter(Boolean))
  return Array.from(nextAgentIds)
}

/**
 * Returns the shared agent selection state used by the sidebar and settings page.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAgentSelection() {
  const context = useContext(AgentSelectionContext)

  if (!context) {
    throw new Error('useAgentSelection must be used within an AgentSelectionProvider')
  }

  return context
}

/**
 * Provides a persistent agent selection and available agent catalog for the app shell.
 */
export function AgentSelectionProvider({ children }: { children: ReactNode }) {
  const { showError } = useErrorHandler()
  const [selectedAgentId, setSelectedAgentIdState] = useState(readSelectedAgentId)
  const [agentIds, setAgentIds] = useState<string[]>(() => ['default', readSelectedAgentId()])
  const [isLoading, setIsLoading] = useState(true)
  const selectedAgentIdRef = useRef(selectedAgentId)

  const setSelectedAgentId = useCallback((agentId: string) => {
    persistSelectedAgentId(agentId)
    setSelectedAgentIdState(agentId)
  }, [])

  useEffect(() => {
    selectedAgentIdRef.current = selectedAgentId
  }, [selectedAgentId])

  const refreshAgentCatalog = useCallback(async (config?: JsonRecord, signal?: AbortSignal) => {
    setIsLoading(true)

    try {
      const nextConfig = config ?? await fetchUserConfig(signal, showError)
      const currentAgentId = selectedAgentIdRef.current
      const nextAgentIds = extractAgentIds(nextConfig, currentAgentId)
      setAgentIds(nextAgentIds)

      if (!nextAgentIds.includes(currentAgentId)) {
        setSelectedAgentIdState(nextAgentIds[0] ?? 'default')
      }

      return nextAgentIds
    } finally {
      setIsLoading(false)
    }
  }, [showError])

  useEffect(() => {
    persistSelectedAgentId(selectedAgentId)
  }, [selectedAgentId])

  useEffect(() => {
    const controller = new AbortController()

    void refreshAgentCatalog(undefined, controller.signal).catch(() => {})

    return () => controller.abort()
  }, [refreshAgentCatalog])

  const value = useMemo<AgentSelectionContextValue>(
    () => ({
      agentIds,
      isLoading,
      refreshAgentCatalog,
      selectedAgentId,
      setSelectedAgentId,
    }),
    [agentIds, isLoading, refreshAgentCatalog, selectedAgentId, setSelectedAgentId],
  )

  return <AgentSelectionContext.Provider value={value}>{children}</AgentSelectionContext.Provider>
}
