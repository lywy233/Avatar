export type SkillsHubFilterOption = {
  value: string
  label: string
  count?: number
}

export type SkillsHubFilters = {
  categories: SkillsHubFilterOption[]
  difficulties: SkillsHubFilterOption[]
  tags: SkillsHubFilterOption[]
}

export type SkillsHubSkillListItem = {
  slug: string
  title: string
  summary: string
  category: string
  difficulty: string
  tags: string[]
  estimatedMinutes?: number
  updatedAt?: string
}

export type SkillsHubSkillDetail = SkillsHubSkillListItem & {
  description: string
  outcomes: string[]
  prerequisites: string[]
  steps: string[]
  resources: string[]
  examples: string[]
  content?: string
  metadata: Record<string, string>
}

export type SkillsHubListResponse = {
  items: SkillsHubSkillListItem[]
  total: number
  filters: SkillsHubFilters
}
