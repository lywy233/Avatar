# -*- coding: utf-8 -*-
# flake8: noqa: E501
# pylint: disable=line-too-long,too-many-return-statements
import os
import mimetypes
import unicodedata

from agentscope.tool import ToolResponse
from agentscope.message import (
    TextBlock,
    ImageBlock,
    AudioBlock,
    VideoBlock,
)


async def get_weather(
    location: str,
) -> ToolResponse:
    """查询某个地址的天气情况。

    Args:
        location (`str`):
            需要查询的地址。

    Returns:
        `ToolResponse`:
            The tool response containing the weather info.
    """

    try:

        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text=f"当前天气为晴天",
                )
            ],
        )

    except Exception as e:
        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text=f"Error: Send file failed due to \n{e}",
                ),
            ],
        )
