"""
基础的配置类，为了便于后续切换存储方式，所有需要持久化存储的配置继承自这个类型

"""
from __future__ import annotations

from abc import ABC, abstractmethod
from contextvars import ContextVar
from pathlib import Path
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

ConfigModelT = TypeVar("ConfigModelT", bound=BaseModel)


class BaseConfigManager(ABC, Generic[ConfigModelT]):
    """持久化配置管理抽象基类。

    该类型仅定义配置读取、校验、缓存与设置流程，不绑定具体存储方式。
    后续若切换为数据库、远端配置中心等持久化方案，只需要实现对应的读写逻辑。
    """

    def __init__(self) -> None:
        """初始化配置管理器。"""
        self._config: ConfigModelT | None = None

    @property
    @abstractmethod
    def config_model(self) -> type[ConfigModelT]:
        """返回当前管理器绑定的配置模型类型。"""

    @abstractmethod
    def build_default_config(self) -> ConfigModelT:
        """构建默认配置对象。"""

    @abstractmethod
    def read_config_data(self) -> Any | None:
        """读取原始配置数据。

        Returns:
            原始配置数据；若当前存储中不存在配置则返回 ``None``。
        """

    @abstractmethod
    def write_config_data(self, data: dict[str, Any]) -> None:
        """写入原始配置数据。"""

    def validate_config(self, config: ConfigModelT | dict[str, Any]) -> ConfigModelT:
        """将输入校验并转换为配置模型。"""
        if isinstance(config, self.config_model):
            return config
        return self.config_model.model_validate(config)

    def get_config(self, reload: bool = False) -> ConfigModelT:
        """获取当前配置。

        Args:
            reload: 是否强制重新从持久化存储加载。

        Returns:
            当前配置对象。
        """
        if reload or self._config is None:
            self._config = self.load_config()
        return self._config

    def load_config(self) -> ConfigModelT:
        """从持久化存储读取配置，不存在时写入默认配置。

        Returns:
            读取到的配置对象。
        """
        payload = self.read_config_data()
        if payload is None:
            default_config = self.build_default_config()
            return self.save_config(default_config)

        config = self.config_model.model_validate(payload)
        self._config = config
        return config

    def save_config(self, config: ConfigModelT) -> ConfigModelT:
        """保存配置到持久化存储。

        Args:
            config: 需要持久化的配置对象。

        Returns:
            保存后的配置对象。
        """
        validated_config = self.validate_config(config)
        self.write_config_data(validated_config.model_dump(mode="json"))
        self._config = validated_config
        return validated_config

    def set_config(self, config: ConfigModelT | dict[str, Any]) -> ConfigModelT:
        """设置配置并立即持久化保存。

        Args:
            config: 配置对象或可用于构建配置对象的字典。

        Returns:
            保存后的配置对象。
        """
        return self.save_config(self.validate_config(config))


class BaseJsonConfigManager(BaseConfigManager[ConfigModelT], ABC):
    """基于本地 JSON 文件的配置管理默认实现。

    JSON 文件中的结构由 ``config_model`` 对应的 pydantic 模型定义与校验。
    """

    @abstractmethod
    def get_config_path(self) -> Path:
        """返回配置文件路径。"""

    def read_config_data(self) -> dict[str, Any] | None:
        """从 JSON 文件中读取配置数据。"""
        config_path = self.get_config_path()
        if not config_path.exists():
            return None

        json_text = config_path.read_text(encoding="utf-8")
        return self.config_model.model_validate_json(json_text).model_dump(mode="json")

    def write_config_data(self, data: dict[str, Any]) -> None:
        """将配置数据写入 JSON 文件。"""
        config_path = self.get_config_path()
        config_path.parent.mkdir(parents=True, exist_ok=True)
        validated_config = self.config_model.model_validate(data)
        config_path.write_text(
            validated_config.model_dump_json(indent=2),
            encoding="utf-8",
        )


class BaseContextConfigManager(BaseConfigManager[ConfigModelT], ABC):
    """基于 ``ContextVar`` 的配置管理默认实现。

    该实现适用于请求级、任务级的临时配置，不负责跨请求持久化。
    """

    @abstractmethod
    def get_context_var(self) -> ContextVar[ConfigModelT | None]:
        """返回配置绑定的上下文变量。"""

    def read_config_data(self) -> dict[str, Any] | None:
        """从上下文变量中读取配置数据。"""
        config = self.get_context_var().get(None)
        if config is None:
            return None
        return config.model_dump(mode="json")

    def write_config_data(self, data: dict[str, Any]) -> None:
        """将配置数据写入上下文变量。"""
        validated_config = self.config_model.model_validate(data)
        self.get_context_var().set(validated_config)
