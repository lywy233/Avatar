from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from .models import SkillDetail, SkillListResponse
from .store import get_skill_by_slug, list_skills

router = APIRouter(tags=["skills-hub"])


@router.get("/skills", response_model=SkillListResponse)
async def get_skills(
    q: str | None = Query(default=None, description="Free-text search query."),
    category: str | None = Query(default=None, description="Category filter."),
    tag: str | None = Query(default=None, description="Tag filter."),
    difficulty: str | None = Query(default=None, description="Difficulty filter."),
) -> SkillListResponse:
    """Return a filtered view of the in-memory skills pool."""

    return list_skills(
        q=q,
        category=category,
        tag=tag,
        difficulty=difficulty,
    )


@router.get("/skills/{slug}", response_model=SkillDetail)
async def get_skill_detail(slug: str) -> SkillDetail:
    """Return full detail for a single skill record."""

    skill = get_skill_by_slug(slug)
    if skill is None:
        raise HTTPException(status_code=404, detail=f"Skill '{slug}' was not found.")
    return skill
