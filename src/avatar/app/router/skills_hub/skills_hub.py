"""
skill_hub_manager是一个对于skill进行整体管理和使用的权限
"""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml

from .skill import Skill, SkillMetadata

_MANIFEST_FILE_NAME = "skills-manifest.json"
_SKILL_MARKDOWN_NAME = "SKILL.md"


def _timestamp() -> str:
    return datetime.now().isoformat()

def _load_front_matter(skill_dir: Path) -> dict[str, Any]:
    """
    从md文件中获取完整的skill元数据
    """

    skill_md_path = skill_dir / _SKILL_MARKDOWN_NAME
    text = skill_md_path.read_text(encoding="utf-8")
    matched = re.match(r"^---\s*\n(.*?)\n---\s*(?:\n|$)", text, flags=re.DOTALL)
    if matched is None:
        return {}

    parsed = yaml.safe_load(matched.group(1))
    if parsed is None:
        return {}
    if not isinstance(parsed, dict):
        return {}

    return parsed


def _build_skill_data(skill_dir: Path) -> dict[str, Any]:
    front_matter = _load_front_matter(skill_dir)
    print(front_matter)
    metadata = Skill(
        **front_matter,
        skill_dir = str(skill_dir)
    )

    return metadata.model_dump()


class SkillHubBase(ABC):
    """skill hub 抽象类，文件式管理，每个工作目录下都是一个简单的skill hub，全局的skillhub则支持下发功能"""

    def __init__(self, workspace_dir: Path):
        super().__init__()
        self.workspace_dir = workspace_dir
        self.workspace_skills_dir = workspace_dir / "skills"


    def _discover_skill_directories(self) -> list[Path]:
        """获取 workspace/skills 目录下一级子目录里的 SKILL.md 路径。"""

        if not self.workspace_skills_dir.is_dir():
            return []

        skill_dirs: set[Path] = set()
        for child in self.workspace_skills_dir.iterdir():
            if not child.is_dir():
                continue

            skill_md_path = child / _SKILL_MARKDOWN_NAME
            if skill_md_path.is_file():
                skill_dirs.add(child)

        return sorted(skill_dirs)
        


    @abstractmethod
    async def list_all_skills(self) -> list[Skill]:
        """列出当前的技能情况"""

    @abstractmethod
    async def add_skill(self, skill: Skill) -> None:
        """通过skill类型添加技能"""

    @abstractmethod
    async def delete_skill(self, skill_name: str) -> None:
        """删除技能和对应文件"""


class AppSkillHub(SkillHubBase):
    """
    app 的skillhub，完整的skillhub功能，需要拥有下发，接受接收提交，审核提交的功能
    
    TODO 支持下发和接收提交
    
    """
    def __init__(self, workspace_dir: Path):
        super().__init__(workspace_dir=workspace_dir)
        self.skills_metadata = {} # 内部metadata，记录包含开关等更复杂信息的metadata TODO ,这里理应继承智能体中的配置信息
        self.manifest_path = workspace_dir / _MANIFEST_FILE_NAME
        skills_list = []
        self.skills_manifest = {} # TODO 后续应该先从数据库获取一遍完整数据。
        self.recreate_manifest()

    def list_all_skills(self) -> list[Skill]:
        # TODO 这里是
        return self.skills_list

    def get_skill_manifest(self) -> list[Skill]:
        return self.skills_manifest


    async def add_skill(self, skill: Skill) -> None:
        raise NotImplementedError("AppSkillHub.add_skill 暂未实现")

    async def delete_skill(self, skill_name: str) -> None:
        raise NotImplementedError("AppSkillHub.delete_skill 暂未实现")

    def _updata_manifest(
        self,
        update_data: Any,
    ) -> dict[str, Any]:
        if self.manifest_path.exists():
            manifest_data = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        else:
            manifest_data = {}
        
        manifest_data.update(update_data)
        
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self.manifest_path.write_text(
            json.dumps(manifest_data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return manifest_data


    def recreate_manifest(self) -> dict[str, Any]:
        """
        重建skills的内部索引
        """
        self.skills_manifest = {}
        discovered = self._discover_skill_directories()
        for skill_dir in discovered:
            skill_data =_build_skill_data(skill_dir)
            
            self.skills_manifest[skill_data["name"]] = skill_data
        
        self.skills_list = [v for k,v in self.skills_manifest.items()]
        return self._updata_manifest(
            self.skills_manifest,
        )