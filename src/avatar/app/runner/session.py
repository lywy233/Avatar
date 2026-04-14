"""
个性化的session管理器
"""
# -*- coding: utf-8 -*-
"""Safe JSON session with filename sanitization for cross-platform
compatibility.

Windows filenames cannot contain: \\ / : * ? " < > |
This module wraps agentscope's SessionBase so that session_id and user_id
are sanitized before being used as filenames.
"""
import os
import re
import json
import logging

from typing import Union, Sequence

import aiofiles
from agentscope.session import SessionBase,JSONSession,RedisSession
from agentscope_runtime.engine.schemas.exception import ConfigurationException
logger = logging.getLogger(__name__)


class CustomSession(JSONSession):
    def __init__(self):
        super().__init__(save_dir = ".avatar/")