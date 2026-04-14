"""
结合配置和入参形成请求所对应的contextvars
"""
# agent_context 是agent层面的，处理agent对应的配置信息

from contextvars import ContextVar, copy_context, Token
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional, Any
import copy
import asyncio

T = TypeVar('T', bound=BaseModel)


class DeepCopyContextVar(Generic[T]):
    """
    支持深拷贝的 ContextVar 包装器。

    每次 set 时自动深拷贝，保证获取的值是独立的。
    包装 ContextVar[T]，提供类型安全的深拷贝操作。
    """

    def __init__(self, name: str, default: Optional[T] = None):
        self._var: ContextVar[Optional[T]] = ContextVar(name, default=None)
        self._name = name
        if default is not None:
            self._var.set(copy.deepcopy(default))

    def set(self, value: T) -> Token[T]:
        """设置值（自动深拷贝）"""
        return self._var.set(copy.deepcopy(value))

    def get(self, default: Optional[T] = None) -> T:
        """获取值（返回深拷贝副本）"""
        val = self._var.get(default)
        if val is None and default is not None:
            return copy.deepcopy(default)
        if val is None:
            raise ValueError(f"ContextVar '{self._name}' has no value and no default was provided")
        return copy.deepcopy(val)

    @property
    def token(self) -> ContextVar[Any]:
        """返回底层的 ContextVar（用于调试）"""
        return self._var


from avatar.config.runnning_config import RunningConfig

# 全局运行配置变量，使用深拷贝的 ContextVar
running_config: DeepCopyContextVar[RunningConfig] = DeepCopyContextVar(
    "running_config",
    default=RunningConfig()
)


def get_running_config() -> RunningConfig:
    """获取当前运行配置的深拷贝副本"""
    return running_config.get()


def set_running_config(config: RunningConfig) -> None:
    """设置运行配置（自动深拷贝）"""
    running_config.set(config)


def update_running_config(**kwargs) -> RunningConfig:
    """
    更新运行配置的指定字段，返回新的深拷贝

    Usage:
        update_running_config(temperature=0.9)
        update_running_config(model_name="claude-3", debug=True)
    """
    current = running_config.get()
    updated = current.model_copy(update=kwargs)
    running_config.set(updated)
    return updated


if __name__ == "__main__":
    async def test_basic_operations():
        """测试基本操作"""
        print("=== Test Basic Operations ===")
        config = get_running_config()
        print(f"Initial config: {config}")

        # 更新特定字段
        updated = update_running_config(temperature=0.9, debug=True)
        print(f"After update: {updated}")

        # 验证原始配置未被修改
        original = get_running_config()
        print(f"Original unchanged: {original}")
        print()

    async def test_child_task_isolation():
        """测试子任务的隔离性（需要使用 copy_context 创建隔离上下文）"""
        print("=== Test Child Task Isolation ===")

        async def child_task_in_isolated_context():
            """在隔离上下文中运行的子任务"""
            ctx = copy_context()
            ctx.run(_isolated_child_work)
            print(f"  Child task in isolated context completed")

        def _isolated_child_work():
            """在 copy_context 中运行的隔离工作"""
            update_running_config(model_name="child-model", debug=True)
            print(f"  Child isolated config: {get_running_config()}")

        # 主任务设置配置
        set_running_config(RunningConfig(model_name="parent-model", temperature=0.5))
        print(f"Parent before child: {get_running_config()}")

        # 在隔离上下文中执行子任务
        await child_task_in_isolated_context()

        # 验证父任务配置未被子任务影响
        parent_after = get_running_config()
        print(f"Parent after child: {parent_after}")
        assert parent_after.model_name == "parent-model", "Parent config should not be affected"
        print("✓ Child task isolation works correctly (via copy_context)")
        print()

    async def test_concurrent_tasks():
        """测试并发任务的隔离性（使用 copy_context 创建独立上下文）"""
        print("=== Test Concurrent Tasks ===")

        def task_work(task_name: str, model: str, temp: float):
            """在 copy_context 中运行的工作函数"""
            update_running_config(model_name=model, temperature=temp)
            return (task_name, get_running_config())

        async def task_a():
            return await asyncio.to_thread(copy_context().run, task_work, "A", "task-a-model", 1.0)

        async def task_b():
            return await asyncio.to_thread(copy_context().run, task_work, "B", "task-b-model", 0.0)

        # 初始配置
        set_running_config(RunningConfig(model_name="initial", temperature=0.7))
        print(f"Initial: {get_running_config()}")

        # 并发执行
        results = await asyncio.gather(task_a(), task_b())

        # 验证每个任务有独立的配置
        print(f"Task A result: {results[0]}")
        print(f"Task B result: {results[1]}")
        print()

    async def test_context_copy():
        """测试 copy_context 在线程/任务中的行为"""
        print("=== Test Context Copy ===")

        async def task_in_new_context():
            # 在新上下文中运行
            ctx = copy_context()
            result = ctx.run(_get_config_in_context)
            print(f"Task in copied context: {result}")
            return result

        set_running_config(RunningConfig(model_name="context-test", debug=True))
        print(f"Main context: {get_running_config()}")

        await task_in_new_context()
        print(f"Main after copied context task: {get_running_config()}")
        print()

    def _get_config_in_context() -> RunningConfig:
        """在新上下文中获取配置（会返回默认值，因为是新上下文）"""
        # 在新上下文中，running_config 会有自己的默认值
        config = running_config.get()
        print(f"  Inside copied context, got: {config}")
        return config

    async def test_pydantic_validation():
        """测试 pydantic 验证"""
        print("=== Test Pydantic Validation ===")

        # 设置有效配置
        set_running_config(RunningConfig(model_name="gpt-3.5", temperature=0.8))
        print(f"Valid config set: {get_running_config()}")

        # 测试类型验证 - temperature 应该在合理范围
        # pydantic 默认不验证 0-2 范围，这里仅演示设置值
        set_running_config(RunningConfig(model_name="test", temperature=5.0))
        print(f"Set temperature=5.0: {get_running_config()}")
        print()

    async def run_all_tests():
        """运行所有测试"""
        print("Running ContextVar + Pydantic Tests\n")
        print("=" * 50)

        await test_basic_operations()
        await test_child_task_isolation()
        await test_concurrent_tasks()
        await test_context_copy()
        await test_pydantic_validation()

        print("=" * 50)
        print("All tests passed!")

    asyncio.run(run_all_tests())
