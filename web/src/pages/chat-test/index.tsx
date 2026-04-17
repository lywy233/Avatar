import { MessageSquareIcon, SparklesIcon } from 'lucide-react'

import { AvatarChat } from '@/components/avatar_chat/avatar-chat'
import { avatarChatContract } from '@/components/avatar_chat/use-avatar-chat'
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

/** Local chat playground page that leaves the existing `/chat` route untouched. */
export default function ChatTestPage() {
  const { showError } = useErrorHandler()

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
                  <p className="truncate text-sm font-semibold">Avatar chat test</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Local shadcn/ui + react-markdown runtime UI
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">v{appVersion}</Badge>
              <Badge variant="outline" className="hidden sm:inline-flex">
                /ChatTest
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <Card className="border shadow-none">
              <CardHeader className="gap-3 border-b">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg border bg-secondary/60 text-foreground">
                    <SparklesIcon />
                  </div>

                  <div className="flex min-w-0 flex-col gap-1">
                    <CardTitle>Chat runtime experiment</CardTitle>
                    <CardDescription>
                      This route keeps the same API contract as{' '}
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/chat</code>,
                      but renders a fully local UI with SSE parsing, in-place assistant
                      updates, regenerate, stop, and browser persistence.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="h-[calc(100svh-17rem)] min-h-[36rem]">
                  <AvatarChat endpoint={avatarChatContract.endpoint} onError={showError} />
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
