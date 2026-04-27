"""
这里 agent skill 的原始类
skill 的实例定义是绑定地址的
"""

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SkillMetadata(BaseModel):
    """Skill 元数据定义，保留扩展字段兼容性。"""

    model_config = ConfigDict(extra="allow")

    version: str = Field(default="0.0.1", description="技能版本号，默认 0.0.1。")
    icon: str | None = Field(default="🛠️", description="技能图标，建议为单个 emoji。")
    tags: list[str] = Field(default_factory=list, description="技能标签列表。")
    enabled:bool = Field(default=True,description="是否打开（实际控制模型系统提示词红是否能够直接看到）")

    @field_validator("icon")
    @classmethod
    def validate_icon(cls, value: str | None) -> str | None:
        if value is None:
            return value

        icon = value.strip()
        if not icon:
            return None

        if any(char.isspace() for char in icon):
            raise ValueError("icon 必须是单个 emoji，不能包含空白字符")

        return icon

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: list[str]) -> list[str]:
        return [tag.strip() for tag in value if tag and tag.strip()]


class Skill(BaseModel):
    """
    Agent Skill 的基础定义类。
    
    Skill 的核心概念是：一个可执行的能力单元，具有唯一的名称、描述、元数据以及指向实际实现（代码/文件/远程服务）的路径。
    """

    # 1. 名称：技能的唯一标识符或人类可读名称
    name: str = Field(..., description="技能的唯一名称，例如 'send_email', 'search_web'")

    # 2. 描述：技能的用途说明，用于 LLM 理解何时调用此技能
    description: str = Field(..., description="技能的详细描述，告诉 LLM 这个技能能做什么，以及适用场景")

    # 3. 元数据：扩展信息，如依赖、权限、版本、参数schema等
    metadata: SkillMetadata = Field(
        default_factory=SkillMetadata,
        description="技能的元数据，包含 version、icon、tags 等扩展信息。"
    )
    
    skill_dir: str = Field(..., description="技能绑定的相对地址。相对于模型工作目录（项目目录）")
    
    
    
