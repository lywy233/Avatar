"""
处理临时的agent_context
从user_config 等抽离aget_context 
# TODO 临时直接使用runnning config
"""

from ..config import RunningConfig, get_running_config, set_running_config


def set_agent_context(config: RunningConfig):
    set_running_config(config)
    return


def get_agent_context() -> RunningConfig:
    return get_running_config
