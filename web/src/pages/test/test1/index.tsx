import { FlaskConicalIcon } from 'lucide-react'
import { useState } from 'react'

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

const detailCards = [
  {
    title: 'Cleaner hierarchy',
    description:
      'A clearer headline, supporting copy, and grouped metadata make the page feel deliberate without adding scope.',
  },
  {
    title: 'Token-driven styling',
    description:
      'All colors and surfaces come from the existing shadcn-style theme tokens already defined in the app.',
  },
  {
    title: 'Small interactive touch',
    description:
      'The buttons keep this route useful as a quick UI sandbox while staying fully local to the page.',
  },
] as const

export default function Test1Page() {
  const [previewEnabled, setPreviewEnabled] = useState(true)
  const [refreshCount, setRefreshCount] = useState(1)

  const statusCards = [
    {
      label: 'Status',
      value: previewEnabled ? 'Preview armed' : 'Quiet mode',
      hint: previewEnabled ? 'Interactive controls enabled' : 'Static content only',
    },
    {
      label: 'Refreshes',
      value: `${refreshCount}`,
      hint: 'Local button state only',
    },
    {
      label: 'Stack',
      value: 'React + shadcn/ui',
      hint: 'Tailwind tokens and local route',
    },
  ] as const

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
                  <FlaskConicalIcon />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Avatar test page</p>
                  <p className="truncate text-xs text-muted-foreground">Local visual sandbox</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">v{appVersion}</Badge>
              <Badge variant="outline" className="hidden sm:inline-flex">
                /test/test1
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
              <Card className="overflow-hidden border shadow-sm">
                <CardHeader className="gap-4 border-b bg-muted/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Throwaway test route</Badge>
                    <Badge variant="secondary">/test/test1</Badge>
                  </div>

                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-muted-foreground">Local visual smoke test</p>
                    <CardTitle className="max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
                      A nicer-looking test page that still behaves like a simple sandbox.
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-base leading-7 md:text-lg">
                      This route keeps its lightweight purpose, but now leans on official shadcn/ui
                      building blocks so the layout feels intentional without adding complexity.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-6 pt-6 md:grid-cols-[1.35fr_0.85fr] md:items-start">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => setPreviewEnabled((current) => !current)}>
                        {previewEnabled ? 'Disable preview mode' : 'Enable preview mode'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRefreshCount((count) => count + 1)}
                      >
                        Refresh sample data
                      </Button>
                    </div>

                    <Separator />

                    <p className="text-sm leading-6 text-muted-foreground">
                      Keep this route as a small local sandbox for checking tokens, spacing, and basic
                      interaction without touching app-wide UI.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {statusCards.map((card) => (
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
                </CardContent>

                <CardFooter className="flex flex-wrap justify-between gap-3 text-sm text-muted-foreground">
                  <span>Preview mode {previewEnabled ? 'is active' : 'is paused'}.</span>
                  <span>Sample refresh count: {refreshCount}</span>
                </CardFooter>
              </Card>

              <section className="grid gap-4 md:grid-cols-3">
                {detailCards.map((card) => (
                  <Card key={card.title} size="sm" className="border bg-secondary/35 shadow-none">
                    <CardHeader className="gap-2">
                      <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                      <CardDescription className="text-sm leading-6">
                        {card.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </section>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
