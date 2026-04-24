from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SkillRecord(BaseModel):
    """Canonical in-memory skill record.

    The shape is intentionally storage-friendly so the same fields can later
    map cleanly to a database table or document model.
    """

    id: str = Field(description="Stable internal identifier.")
    slug: str = Field(description="Stable public slug used in URLs.")
    name: str = Field(description="Display name shown in the Skills Hub.")
    tagline: str = Field(description="Short value proposition for list cards.")
    summary: str = Field(description="Concise summary shown in list/detail views.")
    description: str = Field(description="Full description for the detail panel.")
    category: str = Field(description="High-level grouping for browsing.")
    tags: list[str] = Field(default_factory=list, description="Searchable tags.")
    difficulty: str = Field(description="Approximate skill usage difficulty.")
    author: str = Field(description="Source or maintainer name.")
    version: str = Field(description="Current published version label.")
    is_featured: bool = Field(
        default=False,
        description="Whether the skill should be surfaced first in curated lists.",
    )
    created_at: datetime = Field(description="Initial publication timestamp.")
    updated_at: datetime = Field(description="Last update timestamp.")
    use_cases: list[str] = Field(
        default_factory=list,
        description="Representative scenarios the skill is useful for.",
    )


class SkillSummary(BaseModel):
    id: str
    slug: str
    name: str
    tagline: str
    summary: str
    category: str
    tags: list[str]
    difficulty: str
    author: str
    version: str
    is_featured: bool
    updated_at: datetime


class SkillDetail(SkillSummary):
    description: str
    created_at: datetime
    use_cases: list[str]


class SkillFilterOption(BaseModel):
    value: str
    label: str
    count: int


class SkillFilters(BaseModel):
    categories: list[SkillFilterOption] = Field(default_factory=list)
    difficulties: list[SkillFilterOption] = Field(default_factory=list)
    tags: list[SkillFilterOption] = Field(default_factory=list)


class SkillListResponse(BaseModel):
    items: list[SkillSummary]
    total: int
    filters: SkillFilters
