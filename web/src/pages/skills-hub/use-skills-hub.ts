import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  fetchSkillsHubDetail,
  fetchSkillsHubList,
} from '@/pages/skills-hub/api'
import {
  type SkillsHubFilters,
  type SkillsHubSkillDetail,
  type SkillsHubSkillListItem,
} from '@/pages/skills-hub/types'

type UseSkillsHubOptions = {
  onError: (title: string, message: string) => void
}

const EMPTY_FILTERS: SkillsHubFilters = {
  categories: [],
  difficulties: [],
  tags: [],
}

function matchesSearch(skill: SkillsHubSkillListItem, searchQuery: string) {
  if (!searchQuery) {
    return true
  }

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const searchableText = [
    skill.title,
    skill.summary,
    skill.category,
    skill.difficulty,
    ...skill.tags,
  ]
    .join(' ')
    .toLowerCase()

  return searchableText.includes(normalizedSearch)
}

export function useSkillsHub({ onError }: UseSkillsHubOptions) {
  const [skills, setSkills] = useState<SkillsHubSkillListItem[]>([])
  const [filters, setFilters] = useState<SkillsHubFilters>(EMPTY_FILTERS)
  const [totalSkills, setTotalSkills] = useState(0)
  const [isListLoading, setIsListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, SkillsHubSkillDetail>>({})
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadInitialSkills() {
      setIsListLoading(true)
      setListError(null)

      try {
        const response = await fetchSkillsHubList(controller.signal, onError)
        setSkills(response.items)
        setFilters(response.filters)
        setTotalSkills(response.total)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setSkills([])
        setFilters(EMPTY_FILTERS)
        setTotalSkills(0)
        setListError(error instanceof Error ? error.message : 'Failed to load the skills catalog.')
      } finally {
        setIsListLoading(false)
      }
    }

    void loadInitialSkills()

    return () => {
      controller.abort()
    }
  }, [onError])

  const visibleSkills = useMemo(() => {
    return skills.filter((skill) => {
      if (!matchesSearch(skill, searchQuery)) {
        return false
      }

      if (selectedCategory !== 'all' && skill.category !== selectedCategory) {
        return false
      }

      if (selectedDifficulty !== 'all' && skill.difficulty !== selectedDifficulty) {
        return false
      }

      if (selectedTags.length > 0 && !selectedTags.every((tag) => skill.tags.includes(tag))) {
        return false
      }

      return true
    })
  }, [searchQuery, selectedCategory, selectedDifficulty, selectedTags, skills])

  useEffect(() => {
    if (visibleSkills.length === 0) {
      setSelectedSlug(null)
      return
    }

    const selectedSkillStillVisible = visibleSkills.some((skill) => skill.slug === selectedSlug)
    if (selectedSkillStillVisible) {
      return
    }

    // Keep list and detail panes aligned when filtering removes the current selection.
    setSelectedSlug(visibleSkills[0].slug)
  }, [selectedSlug, visibleSkills])

  useEffect(() => {
    if (!selectedSlug) {
      setDetailError(null)
      setIsDetailLoading(false)
      return
    }

    const slugToLoad = selectedSlug

    if (detailCache[slugToLoad]) {
      setDetailError(null)
      setIsDetailLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadSkillDetail() {
      setIsDetailLoading(true)
      setDetailError(null)

      try {
        const detail = await fetchSkillsHubDetail(slugToLoad, controller.signal, onError)
        setDetailCache((currentCache) => ({
          ...currentCache,
          [slugToLoad]: detail,
        }))
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setDetailError(error instanceof Error ? error.message : 'Failed to load skill details.')
      } finally {
        setIsDetailLoading(false)
      }
    }

    void loadSkillDetail()

    return () => {
      controller.abort()
    }
  }, [detailCache, onError, selectedSlug])

  const selectedSkill = selectedSlug ? detailCache[selectedSlug] ?? null : null
  const selectedListItem = visibleSkills.find((skill) => skill.slug === selectedSlug) ?? null

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag],
    )
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedDifficulty('all')
    setSelectedTags([])
  }, [])

  const reloadSkills = useCallback(async () => {
    setDetailCache({})
    setSelectedSlug(null)
    setDetailError(null)
    setIsDetailLoading(false)

    setIsListLoading(true)
    setListError(null)

    const controller = new AbortController()

    try {
      const response = await fetchSkillsHubList(controller.signal, onError)
      setSkills(response.items)
      setFilters(response.filters)
      setTotalSkills(response.total)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      setSkills([])
      setFilters(EMPTY_FILTERS)
      setTotalSkills(0)
      setListError(error instanceof Error ? error.message : 'Failed to load the skills catalog.')
    } finally {
      setIsListLoading(false)
    }
  }, [onError])

  const reloadSelectedSkill = useCallback(async () => {
    if (!selectedSlug) {
      return
    }

    const slugToReload = selectedSlug

    const controller = new AbortController()
    setIsDetailLoading(true)
    setDetailError(null)

    try {
      const detail = await fetchSkillsHubDetail(slugToReload, controller.signal, onError)
      setDetailCache((currentCache) => ({
        ...currentCache,
        [slugToReload]: detail,
      }))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      setDetailError(error instanceof Error ? error.message : 'Failed to load skill details.')
    } finally {
      setIsDetailLoading(false)
    }
  }, [onError, selectedSlug])

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedDifficulty !== 'all' ? 1 : 0) +
    selectedTags.length

  return {
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
  }
}
