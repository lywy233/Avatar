import { BotIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AppSidebar } from '@/components/app-sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0'

const summaryCards = [
  {
    label: 'Navigation',
    value: 'Sidebar',
    hint: 'Official shadcn sidebar primitives with inset content layout.',
  },
  {
    label: 'Header',
    value: `v${appVersion}`,
    hint: 'Project identity and version info stay visible in the top bar.',
  },
  {
    label: 'Routes',
    value: '3 active',
    hint: 'The homepage shell now links the new /chat route alongside the existing sandbox path.',
  },
] as const

const workspaceCards = [
  {
    title: 'Primary content area',
    description:
      'Use this surface for dashboards, agent run summaries, or environment status without revisiting the outer layout.',
  },
  {
    title: 'Production-lean defaults',
    description:
      'The shell stays intentionally simple: semantic tokens, existing shadcn components, and localized routing changes only.',
  },
] as const

function App() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar appVersion={appVersion} />

        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="hidden h-4 sm:block" />

              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg border bg-card text-foreground">
                  <BotIcon />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Avatar</p>
                  <p className="truncate text-xs text-muted-foreground">Frontend workspace</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">v{appVersion}</Badge>
              <Badge variant="outline" className="hidden sm:inline-flex">
                Vite React
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <section
              id="overview"
              className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]"
            >
              <Card className="border shadow-none">
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>Home</Badge>
                    <Badge variant="outline">App shell</Badge>
                  </div>

                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                      A cleaner homepage shell for the Avatar frontend.
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-sm leading-6 md:text-base">
                      The starter landing page is replaced with a navigation-first workspace
                      layout that keeps the existing routes intact and leans on official shadcn
                      primitives.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {summaryCards.map((card) => (
                      <Card key={card.label} size="sm" className="border shadow-none">
                        <CardHeader className="gap-1">
                          <CardDescription className="text-xs font-medium uppercase tracking-[0.18em]">
                            {card.label}
                          </CardDescription>
                          <CardTitle className="text-lg">{card.value}</CardTitle>
                          <CardDescription>{card.hint}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      The layout now starts from a durable app shell: left navigation, a clear top
                      header, and a main panel ready for real dashboard content.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <Button asChild>
                        <Link to="/chat">Open chat route</Link>
                      </Button>
                      <Button asChild>
                        <Link to="/test/test1">Open test route</Link>
                      </Button>
                      <Button asChild variant="outline">
                        <a href="#workspace">Jump to content</a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Routes</CardTitle>
                    <CardDescription>
                      Keep the homepage focused while preserving the existing sandbox path.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                      <span className="text-sm font-medium">/</span>
                      <Badge variant="secondary">Shell</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                      <span className="text-sm font-medium">/chat</span>
                      <Badge variant="outline">AgentScope UI</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                      <span className="text-sm font-medium">/test/test1</span>
                      <Badge variant="outline">Preserved</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Conventions</CardTitle>
                    <CardDescription>
                      The homepage follows the same token-driven styling already used in the UI
                      primitives and test page.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Badge variant="outline">shadcn/ui</Badge>
                    <Badge variant="outline">Tailwind v4</Badge>
                    <Badge variant="outline">Semantic tokens</Badge>
                  </CardFooter>
                </Card>
              </div>
            </section>

            <section id="workspace" className="grid gap-4 lg:grid-cols-2">
              {workspaceCards.map((card) => (
                <Card key={card.title}>
                  <CardHeader>
                    <CardTitle>{card.title}</CardTitle>
                    <CardDescription className="leading-6">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </section>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default App
