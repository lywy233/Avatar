"""
运行配置模型定义
"""
from pydantic import BaseModel


class RunningConfig(BaseModel):
    """运行配置"""
    model_name: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 4096
    debug: bool = False

# TODO 暂时没有实际使用