import {
  BookOpenIcon,
  FolderTreeIcon,
  LibraryBigIcon,
  RefreshCcwIcon,
  SearchIcon,
  SparklesIcon,
} from 'lucide-react'
import type { KeyboardEvent } from 'react'

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
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useErrorHandler } from '@/hooks/use-error-handler'
import { cn } from '@/lib/utils'
import { skillsHubApiBaseUrl } from '@/pages/skills-hub/api'
import { type SkillsHubSkillDetail } from '@/pages/skills-hub/types'
import { useSkillsHub } from '@/pages/skills-hub/use-skills-hub'

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0'

function formatMetadataLabel(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (segment) => segment.toUpperCase())
}

function SkillDetailBody({ skill }: { skill: SkillsHubSkillDetail }) {
  const extraMetadataEntries = Object.entries(skill.metadata.extras)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl border bg-muted/30 text-3xl">
            {skill.metadata.icon ?? '🛠️'}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{skill.name}</h2>
              <Badge variant="secondary">v{skill.metadata.version}</Badge>
              <Badge variant={skill.metadata.enabled ? 'outline' : 'destructive'}>
                {skill.metadata.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            <p className="text-sm leading-7 text-muted-foreground">{skill.description}</p>
          </div>
        </div>

        {skill.metadata.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skill.metadata.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Skill Name
          </p>
          <p className="mt-2 text-sm">{skill.name}</p>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Skill Directory
          </p>
          <p className="mt-2 break-all text-sm">{skill.skillDir || 'Unavailable'}</p>
        </div>
      </div>

      {extraMetadataEntries.length > 0 ? (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Metadata</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {extraMetadataEntries.map(([key, value]) => (
                <div key={key} className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {formatMetadataLabel(key)}
                  </p>
                  <p className="mt-2 break-words text-sm">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function SkillsHubPage() {
  const { showError } = useErrorHandler()
  const {
    totalSkills,
    isListLoading,
    listError,
    searchQuery,
    setSearchQuery,
    visibleSkills,
    selectedSkillName,
    setSelectedSkillName,
    selectedSkill,
    selectedListItem,
    isDetailLoading,
    detailError,
    reloadSkills,
    reloadSelectedSkill,
  } = useSkillsHub({ onError: showError })

  const handleSkillCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    skillName: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelectedSkillName(skillName)
    }
  }

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
                  <LibraryBigIcon />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Skills hub</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Browse local skills by name
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">v{appVersion}</Badge>
              <Badge variant="outline" className="hidden sm:inline-flex">
                /skills-hub
              </Badge>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
            <Card className="border shadow-none">
              <CardHeader className="gap-3 border-b">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Skills hub</Badge>
                  <Badge variant="outline">List first</Badge>
                  <Badge variant="outline">Detail by skill name</Badge>
                </div>

                <div className="flex flex-col gap-2">
                  <CardTitle className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                    Open the catalog, scan the skills, then inspect the full record by skill name.
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-sm leading-6 md:text-base">
                    This page loads the skill list from{' '}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {skillsHubApiBaseUrl}/skills
                    </code>
                    , shows each skill&apos;s name, description, icon, and version, and requests the
                    detail payload from the matching name-based endpoint when a card is selected.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                <Card size="sm" className="border shadow-none">
                  <CardHeader className="gap-1">
                    <CardDescription className="text-xs font-medium uppercase tracking-[0.18em]">
                      Catalog size
                    </CardDescription>
                    <CardTitle className="text-lg">{totalSkills}</CardTitle>
                    <CardDescription>Total skills returned by the API.</CardDescription>
                  </CardHeader>
                </Card>

                <Card size="sm" className="border shadow-none">
                  <CardHeader className="gap-1">
                    <CardDescription className="text-xs font-medium uppercase tracking-[0.18em]">
                      Matching results
                    </CardDescription>
                    <CardTitle className="text-lg">{visibleSkills.length}</CardTitle>
                    <CardDescription>Updated as the search input changes.</CardDescription>
                  </CardHeader>
                </Card>

                <Card size="sm" className="border shadow-none">
                  <CardHeader className="gap-1">
                    <CardDescription className="text-xs font-medium uppercase tracking-[0.18em]">
                      Current selection
                    </CardDescription>
                    <CardTitle className="text-lg">{selectedListItem?.name ?? 'None'}</CardTitle>
                    <CardDescription>
                      Click any skill card to load its detail panel.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
              <div className="flex flex-col gap-6">
                <Card className="border shadow-none">
                  <CardHeader className="gap-3 border-b">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <CardTitle>Skill list</CardTitle>
                        <CardDescription>
                          The list view now reflects the new backend shape directly.
                        </CardDescription>
                      </div>

                      <Button type="button" variant="outline" size="sm" onClick={reloadSkills}>
                        <RefreshCcwIcon data-icon="inline-start" />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-6 pt-6">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="skills-hub-search" className="text-sm font-medium">
                        Search skills
                      </label>
                      <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                        <SearchIcon className="text-muted-foreground" />
                        <Input
                          id="skills-hub-search"
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Search by name, description, version, or tag"
                          className="h-auto border-0 px-0 py-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {isListLoading
                        ? Array.from({ length: 5 }).map((_, index) => (
                            <Card key={`skill-skeleton-${index}`} size="sm" className="border shadow-none">
                              <CardHeader className="gap-2">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                              </CardHeader>
                              <CardContent className="flex gap-2 pb-3">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-5 w-24 rounded-full" />
                              </CardContent>
                            </Card>
                          ))
                        : null}

                      {!isListLoading && listError ? (
                        <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-6">
                          <p className="text-sm font-medium">Unable to load the skills catalog.</p>
                          <p className="text-sm leading-6 text-muted-foreground">{listError}</p>
                          <div>
                            <Button type="button" variant="outline" onClick={reloadSkills}>
                              Try again
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {!isListLoading && !listError && visibleSkills.length === 0 ? (
                        <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-6">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <SparklesIcon className="text-muted-foreground" />
                            No matching skills
                          </div>
                          <p className="text-sm leading-6 text-muted-foreground">
                            Try a broader search to bring skills back into the list.
                          </p>
                        </div>
                      ) : null}

                      {!isListLoading && !listError
                        ? visibleSkills.map((skill) => (
                            <Card
                              key={skill.name}
                              size="sm"
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedSkillName(skill.name)}
                              onKeyDown={(event) => handleSkillCardKeyDown(event, skill.name)}
                              className={cn(
                                'cursor-pointer border shadow-none transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                selectedSkillName === skill.name ? 'bg-muted/30 ring-2 ring-ring' : '',
                              )}
                            >
                              <CardHeader className="gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/30 text-2xl">
                                    {skill.metadata.icon ?? '🛠️'}
                                  </div>

                                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <CardTitle className="text-base">{skill.name}</CardTitle>
                                      <Badge variant="secondary">v{skill.metadata.version}</Badge>
                                    </div>

                                    <CardDescription className="line-clamp-2 leading-6">
                                      {skill.description}
                                    </CardDescription>
                                  </div>
                                </div>
                              </CardHeader>

                              <CardContent className="flex flex-wrap gap-2 pb-3">
                                {skill.metadata.tags.length > 0 ? (
                                  skill.metadata.tags.slice(0, 4).map((tag) => (
                                    <Badge key={tag} variant="outline">
                                      {tag}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline">No tags</Badge>
                                )}
                              </CardContent>
                            </Card>
                          ))
                        : null}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border shadow-none xl:sticky xl:top-6">
                <CardHeader className="gap-3 border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <CardTitle>{selectedListItem?.name ?? 'Skill detail'}</CardTitle>
                      <CardDescription>
                        {selectedListItem
                          ? 'The detail pane uses the selected skill name to request the full payload.'
                          : 'Pick a skill from the list to inspect its detail response.'}
                      </CardDescription>
                    </div>

                    <BookOpenIcon className="text-muted-foreground" />
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-6 pt-6">
                  {isDetailLoading && !selectedSkill ? (
                    <div className="flex flex-col gap-4">
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ) : null}

                  {!isDetailLoading && detailError ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-6">
                      <p className="text-sm font-medium">Unable to load skill details.</p>
                      <p className="text-sm leading-6 text-muted-foreground">{detailError}</p>
                      <div>
                        <Button type="button" variant="outline" onClick={reloadSelectedSkill}>
                          Try detail request again
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {!isDetailLoading && !detailError && !selectedSkill ? (
                    <div className="flex flex-col gap-4 rounded-lg border border-dashed bg-muted/20 p-6">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FolderTreeIcon className="text-muted-foreground" />
                        Waiting for selection
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Choose any visible skill card to request its full detail payload by name.
                      </p>
                    </div>
                  ) : null}

                  {selectedSkill ? <SkillDetailBody skill={selectedSkill} /> : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
