from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .models import Skill, SkillListResponse
# from .store import get_skill_by_slug, list_skills

router = APIRouter(tags=["skills-hub"])
from .skills_hub import AppSkillHub
from ....config import get_app_config

@router.get("/skills",response_model=SkillListResponse)
async def get_skills(
)->SkillListResponse:
    """Return a filtered view of the in-memory skills pool."""
    
    app_skill_hub = AppSkillHub(get_app_config().agent_workspace)
    
    return SkillListResponse(skills=app_skill_hub.list_all_skills())



@router.get("/skills/{skill_name}", response_model=Skill)
async def get_skill_detail(skill_name: str) -> Skill:
    """Return full detail for a single skill record."""

    app_skill_hub = AppSkillHub(get_app_config().agent_workspace)
    skill = app_skill_hub.get_skill_manifest().get(skill_name)
    if skill is None:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' was not found.")
    return skill
