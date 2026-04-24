import {
  BookOpenIcon,
  Clock3Icon,
  FolderIcon,
  Layers3Icon,
  LibraryBigIcon,
  RefreshCcwIcon,
  SearchIcon,
  SparklesIcon,
  TagIcon,
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

function formatFacetLabel(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (segment) => segment.toUpperCase())
}

function formatRelativeLabel(value?: string) {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString()
}

function SkillDetailSection({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={`${title}-${item}`} className="rounded-lg border bg-muted/20 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SkillDetailBody({ skill }: { skill: SkillsHubSkillDetail }) {
  const updatedLabel = formatRelativeLabel(skill.updatedAt)
  const metadataEntries = Object.entries(skill.metadata)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{formatFacetLabel(skill.category)}</Badge>
          <Badge variant="outline">{formatFacetLabel(skill.difficulty)}</Badge>
          {skill.estimatedMinutes ? (
            <Badge variant="outline">{skill.estimatedMinutes} min</Badge>
          ) : null}
          {updatedLabel ? <Badge variant="outline">Updated {updatedLabel}</Badge> : null}
        </div>

        <p className="text-sm leading-7 text-muted-foreground">{skill.description}</p>

        {skill.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skill.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {formatFacetLabel(tag)}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {skill.content ? (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Overview</h3>
            <p className="text-sm leading-7 text-muted-foreground">{skill.content}</p>
          </div>
        </>
      ) : null}

      {skill.outcomes.length > 0 || skill.prerequisites.length > 0 ? <Separator /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SkillDetailSection title="Outcomes" items={skill.outcomes} />
        <SkillDetailSection title="Prerequisites" items={skill.prerequisites} />
      </div>

      {skill.steps.length > 0 ? <Separator /> : null}
      <SkillDetailSection title="Steps" items={skill.steps} />

      {skill.examples.length > 0 || skill.resources.length > 0 ? <Separator /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SkillDetailSection title="Examples" items={skill.examples} />
        <SkillDetailSection title="Resources" items={skill.resources} />
      </div>

      {metadataEntries.length > 0 ? <Separator /> : null}

      {metadataEntries.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Metadata</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {metadataEntries.map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-sm">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function SkillsHubPage() {
  const { showError } = useErrorHandler()
  const {
    filters,
    totalSkills,
    isListLoading,
    listError,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedDifficulty,
    setSelectedDifficulty,
    selectedTags,
    toggleTag,
    clearFilters,
    activeFilterCount,
    visibleSkills,
    selectedSlug,
    setSelectedSlug,
    selectedSkill,
    selectedListItem,
    isDetailLoading,
    detailError,
    reloadSkills,
    reloadSelectedSkill,
  } = useSkillsHub({ onError: showError })

  const handleSkillCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    slug: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelectedSlug(slug)
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
                    Standalone skill catalog browser
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
                  <Badge variant="outline">Read-only API</Badge>
                  <Badge variant="outline">Local filters</Badge>
                </div>

                <div className="flex flex-col gap-2">
                  <CardTitle className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                    Browse the current skill catalog without leaving the Avatar workspace.
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-sm leading-6 md:text-base">
                    This page keeps the existing app shell, fetches its list from{' '}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {skillsHubApiBaseUrl}/skills
                    </code>
                    , and loads the full detail view from the matching slug endpoint.
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
                    <CardDescription>Updated as search and filters change.</CardDescription>
                  </CardHeader>
                </Card>

                <Card size="sm" className="border shadow-none">
                  <CardHeader className="gap-1">
                    <CardDescription className="text-xs font-medium uppercase tracking-[0.18em]">
                      Active filters
                    </CardDescription>
                    <CardTitle className="text-lg">{activeFilterCount}</CardTitle>
                    <CardDescription>
                      {selectedListItem?.title ?? 'Select a skill to inspect its detail panel.'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
              <div className="flex flex-col gap-6">
                <Card className="border shadow-none">
                  <CardHeader className="gap-3 border-b">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <CardTitle>Search and filter</CardTitle>
                        <CardDescription>
                          Narrow the catalog locally without changing the surrounding shell.
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={reloadSkills}>
                          <RefreshCcwIcon data-icon="inline-start" />
                          Refresh
                        </Button>
                      </div>
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
                          placeholder="Search by title, summary, category, difficulty, or tag"
                          className="h-auto border-0 px-0 py-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FolderIcon className="text-muted-foreground" />
                        Category
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={selectedCategory === 'all' ? 'secondary' : 'outline'}
                          onClick={() => setSelectedCategory('all')}
                        >
                          All categories
                        </Button>
                        {filters.categories.map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={selectedCategory === option.value ? 'secondary' : 'outline'}
                            onClick={() => setSelectedCategory(option.value)}
                          >
                            {option.label}
                            {option.count ? ` (${option.count})` : ''}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Layers3Icon className="text-muted-foreground" />
                        Difficulty
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={selectedDifficulty === 'all' ? 'secondary' : 'outline'}
                          onClick={() => setSelectedDifficulty('all')}
                        >
                          All difficulties
                        </Button>
                        {filters.difficulties.map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={selectedDifficulty === option.value ? 'secondary' : 'outline'}
                            onClick={() => setSelectedDifficulty(option.value)}
                          >
                            {option.label}
                            {option.count ? ` (${option.count})` : ''}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {filters.tags.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <TagIcon className="text-muted-foreground" />
                          Tags
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {filters.tags.map((option) => {
                            const isActive = selectedTags.includes(option.value)

                            return (
                              <Button
                                key={option.value}
                                type="button"
                                size="sm"
                                variant={isActive ? 'secondary' : 'outline'}
                                onClick={() => toggleTag(option.value)}
                                aria-pressed={isActive}
                              >
                                {option.label}
                                {option.count ? ` (${option.count})` : ''}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border shadow-none">
                  <CardHeader className="gap-3 border-b">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <CardTitle>Skill list</CardTitle>
                        <CardDescription>
                          Pick a skill to load its full detail response.
                        </CardDescription>
                      </div>

                      <Badge variant="outline">{visibleSkills.length} shown</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-3 pt-6">
                    {isListLoading
                      ? Array.from({ length: 5 }).map((_, index) => (
                          <Card key={`skill-skeleton-${index}`} size="sm" className="border shadow-none">
                            <CardHeader className="gap-2">
                              <Skeleton className="h-4 w-36" />
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-3/4" />
                            </CardHeader>
                            <CardContent className="flex gap-2 pb-3">
                              <Skeleton className="h-5 w-20 rounded-full" />
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
                          Try a broader search or clear one of the active filters to bring skills back
                          into the list.
                        </p>
                        <div>
                          <Button type="button" variant="outline" onClick={clearFilters}>
                            Reset filters
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {!isListLoading && !listError
                      ? visibleSkills.map((skill) => (
                          <Card
                            key={skill.slug}
                            size="sm"
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedSlug(skill.slug)}
                            onKeyDown={(event) => handleSkillCardKeyDown(event, skill.slug)}
                            className={cn(
                              'cursor-pointer border shadow-none transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              selectedSlug === skill.slug ? 'bg-muted/30 ring-2 ring-ring' : '',
                            )}
                          >
                            <CardHeader className="gap-2">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-col gap-1">
                                  <CardTitle className="text-base">{skill.title}</CardTitle>
                                  <CardDescription className="line-clamp-2 leading-6">
                                    {skill.summary}
                                  </CardDescription>
                                </div>

                                {skill.estimatedMinutes ? (
                                  <Badge variant="outline">{skill.estimatedMinutes} min</Badge>
                                ) : null}
                              </div>
                            </CardHeader>

                            <CardContent className="flex flex-col gap-3 pb-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{formatFacetLabel(skill.category)}</Badge>
                                <Badge variant="outline">{formatFacetLabel(skill.difficulty)}</Badge>
                              </div>

                              {skill.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {skill.tags.slice(0, 4).map((tag) => (
                                    <Badge key={tag} variant="outline">
                                      {formatFacetLabel(tag)}
                                    </Badge>
                                  ))}
                                  {skill.tags.length > 4 ? (
                                    <Badge variant="outline">+{skill.tags.length - 4} more</Badge>
                                  ) : null}
                                </div>
                              ) : null}
                            </CardContent>
                          </Card>
                        ))
                      : null}
                  </CardContent>
                </Card>
              </div>

              <Card className="border shadow-none xl:sticky xl:top-6">
                <CardHeader className="gap-3 border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <CardTitle>{selectedListItem?.title ?? 'Skill detail'}</CardTitle>
                      <CardDescription>
                        {selectedListItem
                          ? 'The detail pane uses the selected skill slug to load the full payload.'
                          : 'Pick a skill from the list to inspect its full detail response.'}
                      </CardDescription>
                    </div>

                    <BookOpenIcon className="text-muted-foreground" />
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-6 pt-6">
                  {isDetailLoading && !selectedSkill ? (
                    <div className="flex flex-col gap-4">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </div>
                      <Separator />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
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
                        <Clock3Icon className="text-muted-foreground" />
                        Waiting for selection
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Choose any visible skill card to request its full detail payload from the API.
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
