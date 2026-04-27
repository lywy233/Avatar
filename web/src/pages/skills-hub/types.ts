export type SkillsHubSkillMetadata = {
  version: string
  icon?: string | null
  tags: string[]
  enabled: boolean
  extras: Record<string, string>
}

export type SkillsHubSkillListItem = {
  name: string
  description: string
  skillDir: string
  metadata: SkillsHubSkillMetadata
}

export type SkillsHubSkillDetail = SkillsHubSkillListItem

export type SkillsHubListResponse = {
  skills: SkillsHubSkillListItem[]
}
