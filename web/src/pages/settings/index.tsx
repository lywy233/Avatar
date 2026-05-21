import {
  BotIcon,
  RefreshCcwIcon,
  SaveIcon,
  Settings2Icon,
  UserRoundIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

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
import { useAuth } from '@/hooks/use-auth'
import { useErrorHandler } from '@/hooks/use-error-handler'

import {
  fetchAgentConfig,
  fetchUserConfig,
  updateAgentConfig,
  updateUserConfig,
} from './api'

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0'

type SettingsSection = 'user' | 'agent'
type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function extractAgentIds(config: JsonRecord, currentAgentId: string): string[] {
  const profiles = isRecord(config.agents) && isRecord(config.agents.profiles)
    ? config.agents.profiles
    : {}

  const profileAgentIds = Object.keys(profiles)
  const nextAgentIds = new Set<string>(['default', currentAgentId, ...profileAgentIds].filter(Boolean))
  return Array.from(nextAgentIds)
}

function parseJsonEditorValue(value: string, label: string): JsonRecord {
  const parsedValue = JSON.parse(value) as unknown

  if (!isRecord(parsedValue)) {
    throw new Error(`${label} must be a JSON object.`)
  }

  return parsedValue
}

function ConfigEditor({
  description,
  isLoading,
  jsonText,
  onChange,
  onRefresh,
  onSave,
  saveLabel,
  title,
}: {
  description: string
  isLoading: boolean
  jsonText: string
  onChange: (value: string) => void
  onRefresh: () => void
  onSave: () => void
  saveLabel: string
  title: string
}) {
  return (
    <Card className="border shadow-none">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCcwIcon data-icon="inline-start" />
              Reload
            </Button>
            <Button type="button" size="sm" onClick={onSave} disabled={isLoading}>
              <SaveIcon data-icon="inline-start" />
              {saveLabel}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-[420px] rounded-xl" />
          </div>
        ) : (
          <textarea
            value={jsonText}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            className="min-h-[420px] w-full rounded-xl border bg-muted/10 px-4 py-3 font-mono text-sm leading-6 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        )}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { showError } = useErrorHandler()
  const { authEnabled, user } = useAuth()

  const [activeSection, setActiveSection] = useState<SettingsSection>('user')
  const [selectedAgentId, setSelectedAgentId] = useState('default')
  const [agentIds, setAgentIds] = useState<string[]>(['default'])
  const [userConfigText, setUserConfigText] = useState('{}')
  const [agentConfigText, setAgentConfigText] = useState('{}')
  const [isUserConfigLoading, setIsUserConfigLoading] = useState(true)
  const [isAgentConfigLoading, setIsAgentConfigLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('Loading settings...')

  const currentUsername = authEnabled ? (user?.username ?? 'Loading...') : 'default'

  async function loadUserConfig(signal?: AbortSignal) {
    setIsUserConfigLoading(true)
    try {
      const config = await fetchUserConfig(signal, showError)
      setUserConfigText(formatJson(config))

      const nextAgentIds = extractAgentIds(config, selectedAgentId)
      setAgentIds(nextAgentIds)
      if (!nextAgentIds.includes(selectedAgentId)) {
        setSelectedAgentId(nextAgentIds[0] ?? 'default')
      }
      return config
    } finally {
      setIsUserConfigLoading(false)
    }
  }

  async function loadAgentConfig(agentId: string, signal?: AbortSignal) {
    setIsAgentConfigLoading(true)
    try {
      const config = await fetchAgentConfig(agentId, signal, showError)
      setAgentConfigText(formatJson(config))
      return config
    } finally {
      setIsAgentConfigLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      try {
        await loadUserConfig(controller.signal)
        setStatusMessage('Settings loaded.')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setStatusMessage('Failed to load settings.')
      }
    })()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      try {
        await loadAgentConfig(selectedAgentId, controller.signal)
        setStatusMessage(`Loaded agent config for "${selectedAgentId}".`)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setStatusMessage(`Failed to load agent config for "${selectedAgentId}".`)
      }
    })()

    return () => controller.abort()
  }, [selectedAgentId])

  async function handleReloadUserConfig() {
    try {
      await loadUserConfig()
      setStatusMessage('User config reloaded.')
    } catch {
      setStatusMessage('Failed to reload user config.')
    }
  }

  async function handleReloadAgentConfig() {
    try {
      await loadAgentConfig(selectedAgentId)
      setStatusMessage(`Agent config reloaded for "${selectedAgentId}".`)
    } catch {
      setStatusMessage(`Failed to reload agent config for "${selectedAgentId}".`)
    }
  }

  async function handleSaveUserConfig() {
    try {
      const payload = parseJsonEditorValue(userConfigText, 'User config')
      const savedConfig = await updateUserConfig(payload, showError)
      setUserConfigText(formatJson(savedConfig))

      const nextAgentIds = extractAgentIds(savedConfig, selectedAgentId)
      setAgentIds(nextAgentIds)
      const nextAgentId = nextAgentIds.includes(selectedAgentId)
        ? selectedAgentId
        : (nextAgentIds[0] ?? 'default')
      setSelectedAgentId(nextAgentId)
      await loadAgentConfig(nextAgentId)
      setStatusMessage('User config saved.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save user config.'
      showError('Invalid JSON', message)
      setStatusMessage('Failed to save user config.')
    }
  }

  async function handleSaveAgentConfig() {
    try {
      const payload = parseJsonEditorValue(agentConfigText, 'Agent config')
      const savedConfig = await updateAgentConfig(selectedAgentId, payload, showError)
      setAgentConfigText(formatJson(savedConfig))
      await loadUserConfig()
      setStatusMessage(`Agent config saved for "${selectedAgentId}".`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save agent config.'
      showError('Invalid JSON', message)
      setStatusMessage(`Failed to save agent config for "${selectedAgentId}".`)
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar appVersion={appVersion} />

        <SidebarInset className="min-h-svh">
          <header className="flex h-auto min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <SidebarTrigger className="-ml-1 mt-1" />
              <Separator orientation="vertical" className="mt-2 hidden h-4 sm:block" />

              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg border bg-card text-foreground">
                  <Settings2Icon />
                </div>

                <div className="min-w-0 space-y-2">
                  <div>
                    <p className="truncate text-sm font-semibold">Settings</p>
                    <p className="truncate text-xs text-muted-foreground">
                      View, edit, and overwrite raw JSON for user and agent config.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <UserRoundIcon className="size-3.5" />
                      User: {currentUsername}
                    </Badge>

                    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5">
                      <BotIcon className="size-4 text-muted-foreground" />
                      <label htmlFor="settings-agent-select" className="text-xs text-muted-foreground">
                        Agent
                      </label>
                      <select
                        id="settings-agent-select"
                        value={selectedAgentId}
                        onChange={(event) => setSelectedAgentId(event.target.value)}
                        className="min-w-32 bg-transparent text-sm outline-none"
                      >
                        {agentIds.map((agentId) => (
                          <option key={agentId} value={agentId}>
                            {agentId}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{statusMessage}</Badge>
              <Badge variant="secondary">v{appVersion}</Badge>
              <Badge variant="outline" className="hidden sm:inline-flex">
                /settings
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <Card className="border shadow-none">
              <CardHeader className="gap-3">
                <CardTitle className="text-base">Config sections</CardTitle>
                <CardDescription>
                  Switch between full user config JSON and the selected agent&apos;s full config JSON.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={activeSection === 'user' ? 'default' : 'outline'}
                  onClick={() => setActiveSection('user')}
                >
                  User config
                </Button>
                <Button
                  type="button"
                  variant={activeSection === 'agent' ? 'default' : 'outline'}
                  onClick={() => setActiveSection('agent')}
                >
                  Agent config
                </Button>
              </CardContent>
            </Card>

            {activeSection === 'user' ? (
              <ConfigEditor
                title="User config"
                description="This editor loads the entire user config, lets you edit the raw JSON, and overwrites it on save."
                jsonText={userConfigText}
                isLoading={isUserConfigLoading}
                onChange={setUserConfigText}
                onRefresh={handleReloadUserConfig}
                onSave={handleSaveUserConfig}
                saveLabel="Save user config"
              />
            ) : (
              <ConfigEditor
                title={`Agent config · ${selectedAgentId}`}
                description="This editor loads the selected agent's full config, lets you edit the raw JSON, and overwrites it on save."
                jsonText={agentConfigText}
                isLoading={isAgentConfigLoading}
                onChange={setAgentConfigText}
                onRefresh={handleReloadAgentConfig}
                onSave={handleSaveAgentConfig}
                saveLabel="Save agent config"
              />
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
