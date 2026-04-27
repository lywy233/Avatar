from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from .skill import Skill

class SkillListResponse(BaseModel):
    skills: list[Skill]