import { useCallback, useEffect, useMemo, useState } from 'react'

import { fetchSkillsHubDetail, fetchSkillsHubList } from '@/pages/skills-hub/api'
import {
  type SkillsHubSkillDetail,
  type SkillsHubSkillListItem,
} from '@/pages/skills-hub/types'

type UseSkillsHubOptions = {
  onError: (title: string, message: string) => void
}

function matchesSearch(skill: SkillsHubSkillListItem, searchQuery: string) {
  if (!searchQuery) {
    return true
  }

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const searchableText = [
    skill.name,
    skill.description,
    skill.metadata.version,
    ...skill.metadata.tags,
  ]
    .join(' ')
    .toLowerCase()

  return searchableText.includes(normalizedSearch)
}

export function useSkillsHub({ onError }: UseSkillsHubOptions) {
  const [skills, setSkills] = useState<SkillsHubSkillListItem[]>([])
  const [isListLoading, setIsListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkillName, setSelectedSkillName] = useState<string | null>(null)
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
        setSkills(response.skills)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setSkills([])
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

  const visibleSkills = useMemo(
    () => skills.filter((skill) => matchesSearch(skill, searchQuery)),
    [searchQuery, skills],
  )

  useEffect(() => {
    if (visibleSkills.length === 0) {
      setSelectedSkillName(null)
      return
    }

    const selectedSkillStillVisible = visibleSkills.some(
      (skill) => skill.name === selectedSkillName,
    )
    if (selectedSkillStillVisible) {
      return
    }

    setSelectedSkillName(visibleSkills[0].name)
  }, [selectedSkillName, visibleSkills])

  useEffect(() => {
    if (!selectedSkillName) {
      setDetailError(null)
      setIsDetailLoading(false)
      return
    }

    if (detailCache[selectedSkillName]) {
      setDetailError(null)
      setIsDetailLoading(false)
      return
    }

    const skillNameToLoad = selectedSkillName
    const controller = new AbortController()

    async function loadSkillDetail() {
      setIsDetailLoading(true)
      setDetailError(null)

      try {
        const detail = await fetchSkillsHubDetail(skillNameToLoad, controller.signal, onError)
        setDetailCache((currentCache) => ({
          ...currentCache,
          [skillNameToLoad]: detail,
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
  }, [detailCache, onError, selectedSkillName])

  const selectedSkill = selectedSkillName ? detailCache[selectedSkillName] ?? null : null
  const selectedListItem =
    visibleSkills.find((skill) => skill.name === selectedSkillName) ?? null

  const reloadSkills = useCallback(async () => {
    setDetailCache({})
    setSelectedSkillName(null)
    setDetailError(null)
    setIsDetailLoading(false)
    setIsListLoading(true)
    setListError(null)

    const controller = new AbortController()

    try {
      const response = await fetchSkillsHubList(controller.signal, onError)
      setSkills(response.skills)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      setSkills([])
      setListError(error instanceof Error ? error.message : 'Failed to load the skills catalog.')
    } finally {
      setIsListLoading(false)
    }
  }, [onError])

  const reloadSelectedSkill = useCallback(async () => {
    if (!selectedSkillName) {
      return
    }

    const skillNameToReload = selectedSkillName
    const controller = new AbortController()
    setIsDetailLoading(true)
    setDetailError(null)

    try {
      const detail = await fetchSkillsHubDetail(skillNameToReload, controller.signal, onError)
      setDetailCache((currentCache) => ({
        ...currentCache,
        [skillNameToReload]: detail,
      }))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      setDetailError(error instanceof Error ? error.message : 'Failed to load skill details.')
    } finally {
      setIsDetailLoading(false)
    }
  }, [onError, selectedSkillName])

  return {
    totalSkills: skills.length,
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
  }
}
