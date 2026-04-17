import { AgentScopeRuntimeWebUI, type IAgentScopeRuntimeWebUIOptions } from '@agentscope-ai/chat'
import { ConfigProvider, carbonTheme } from '@agentscope-ai/design'
import { BotIcon, MessageSquareIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { Badge } from '@/components/ui/badge'
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
import { TooltipProvider } from '@/components/ui/tooltip'
import { useErrorHandler } from '@/hooks/use-error-handler'

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0'
const agentRuntimeBaseUrl = import.meta.env.VITE_AGENT_API_BASE_URL ?? '/api/agent/process'

const createErrorHandlingFetch = (onError: (title: string, message: string) => void) => {
  return async (data: {
    input: unknown[]
    biz_params?: { user_prompt_params?: Record<string, string> }
    signal?: AbortSignal
  }): Promise<Response> => {
    let response: Response
    try {
      response = await fetch(agentRuntimeBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: data.signal,
      })
    } catch (networkError) {
      const err = networkError instanceof Error ? networkError.message : 'Network error'
      onError('Request Failed', `Unable to connect: ${err}`)
      throw networkError
    }

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('application/json')) {
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            errorMessage = typeof errorData.error === 'string' 
              ? errorData.error 
              : errorData.error?.message || JSON.stringify(errorData.error)
          } else if (errorData?.message) {
            errorMessage = errorData.message
          }
        // eslint-disable-next-line no-empty
        } catch {}
      } else {
        const text = await response.text().catch(() => '')
        if (text) errorMessage = `${errorMessage}: ${text.substring(0, 200)}`
      }
      
      onError('API Error', errorMessage)
      throw new Error(errorMessage)
    }

    return response
  }
}

export default function ChatPage() {
  const { showError } = useErrorHandler()

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      const message = error instanceof Error ? error.message : String(error)
      if (message && !message.includes('AbortError') && !message.includes('aborted')) {
        showError('Unexpected Error', message)
      }
    }

    const handleGlobalError = (event: ErrorEvent) => {
      const message = event.message
      if (message && !message.includes('ResizeObserver') && !message.includes('Warning')) {
        showError('Unexpected Error', message)
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleGlobalError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleGlobalError)
    }
  }, [showError])

  const chatOptions = useMemo<IAgentScopeRuntimeWebUIOptions>(() => ({
    api: {
      baseURL: agentRuntimeBaseUrl,
      fetch: createErrorHandlingFetch(showError),
    },
    session: {
      multiple: false,
    },
    theme: {
      locale: 'en',
      leftHeader: {
        title: 'Avatar Chat',
      },
    },
    sender: {
      maxLength: 4000,
      placeholder: 'Ask Avatar anything…',
      disclaimer: 'Responses may be imperfect. Verify important details before relying on them.',
    },
    welcome: {
      greeting: 'Chat with Avatar',
      nick: 'Avatar',
      description: 'AgentScope Runtime powers the chat surface for this frontend route.',
      prompts: [
        { value: 'Summarize what this Avatar app does.' },
        { value: 'Explain the current frontend structure.' },
        { value: 'What routes are available in this project?' },
      ],
    },
  }), [showError])

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
                  <MessageSquareIcon />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Avatar chat</p>
                  <p className="truncate text-xs text-muted-foreground">AgentScope Runtime WebUI</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">v{appVersion}</Badge>
              <Badge variant="outline" className="hidden sm:inline-flex">
                /chat
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <Card className="flex flex-1 flex-col overflow-hidden border shadow-none">
              <CardHeader className="gap-3 border-b">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg border bg-secondary/60 text-foreground">
                    <BotIcon />
                  </div>

                  <div className="flex min-w-0 flex-col gap-1">
                    <CardTitle>Runtime chat panel</CardTitle>
                    <CardDescription>
                      Requests stream to{' '}
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {agentRuntimeBaseUrl}
                      </code>
                      .
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col pt-6">
                <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
                  <ConfigProvider {...carbonTheme}>
                    <div className="h-full">
                      <AgentScopeRuntimeWebUI options={chatOptions} />
                    </div>
                  </ConfigProvider>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
