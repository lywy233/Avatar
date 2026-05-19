from __future__ import annotations

import base64
import json
import os
from typing import Any
from urllib.parse import urlparse

from agentscope.formatter._openai_formatter import (
    OpenAIChatFormatter,
    _format_openai_image_block,
    _to_openai_audio_data,
    logger,
)
from agentscope.message import (
    AudioBlock,
    ImageBlock,
    Msg,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    URLSource,
    VideoBlock,
)

_SUPPORTED_VIDEO_EXTENSIONS: dict[str, str] = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mpeg": "video/mpeg",
    ".mpg": "video/mpeg",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
}


def _format_openai_video_block(video_block: VideoBlock) -> dict[str, Any]:
    """Format a video block for OpenAI-compatible APIs."""
    source = video_block["source"]
    if source["type"] == "base64":
        media_type = source["media_type"]
        url = f"data:{media_type};base64,{source['data']}"
    elif source["type"] == "url":
        raw_url = source["url"].removeprefix("file://")
        if os.path.exists(raw_url) and os.path.isfile(raw_url):
            extension = os.path.splitext(raw_url)[1].lower()
            media_type = _SUPPORTED_VIDEO_EXTENSIONS.get(extension)
            if not media_type:
                raise ValueError(
                    f"Unsupported video extension: {extension}",
                )
            with open(raw_url, "rb") as video_file:
                base64_video = base64.b64encode(video_file.read()).decode(
                    "utf-8",
                )
            url = f"data:{media_type};base64,{base64_video}"
        else:
            parsed_url = urlparse(raw_url)
            if parsed_url.scheme not in ("", "file"):
                url = source["url"]
            else:
                raise ValueError(
                    f'Invalid video URL: "{source["url"]}". '
                    "It should be a local file or a web URL.",
                )
    else:
        raise ValueError(
            f"Unsupported video source type: {source['type']}",
        )

    return {
        "type": "video_url",
        "video_url": {
            "url": url,
        },
    }


class OpenAIVideoChatFormatter(OpenAIChatFormatter):
    """Minimal OpenAI formatter that adds native video block support."""

    supported_blocks = [
        TextBlock,
        ImageBlock,
        AudioBlock,
        VideoBlock,
        ToolUseBlock,
        ToolResultBlock,
    ]

    async def _format(self, msgs: list[Msg]) -> list[dict[str, Any]]:
        self.assert_list_of_msgs(msgs)

        messages: list[dict[str, Any]] = []
        i = 0
        while i < len(msgs):
            msg = msgs[i]
            content_blocks: list[dict[str, Any]] = []
            tool_calls: list[dict[str, Any]] = []

            for block in msg.get_content_blocks():
                typ = block.get("type")
                if typ == "text":
                    content_blocks.append({**block})
                elif typ == "tool_use":
                    tool_calls.append(
                        {
                            "id": block.get("id"),
                            "type": "function",
                            "function": {
                                "name": block.get("name"),
                                "arguments": json.dumps(
                                    block.get("input", {}),
                                    ensure_ascii=False,
                                ),
                            },
                        },
                    )
                elif typ == "tool_result":
                    textual_output, multimodal_data = (
                        self.convert_tool_result_to_string(block["output"])
                    )
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": block.get("id"),
                            "content": textual_output,
                            "name": block.get("name"),
                        },
                    )

                    promoted_blocks: list = []
                    for url, multimodal_block in multimodal_data:
                        if (
                            multimodal_block["type"] == "image"
                            and self.promote_tool_result_images
                        ):
                            promoted_blocks.extend(
                                [
                                    TextBlock(
                                        type="text",
                                        text=f"\n- The image from '{url}': ",
                                    ),
                                    ImageBlock(
                                        type="image",
                                        source=URLSource(
                                            type="url",
                                            url=url,
                                        ),
                                    ),
                                ],
                            )

                    if promoted_blocks:
                        msgs.insert(
                            i + 1,
                            Msg(
                                name="user",
                                content=[
                                    TextBlock(
                                        type="text",
                                        text="<system-info>The following are "
                                        "the image contents from the tool "
                                        f"result of '{block['name']}':",
                                    ),
                                    *promoted_blocks,
                                    TextBlock(
                                        type="text",
                                        text="</system-info>",
                                    ),
                                ],
                                role="user",
                            ),
                        )
                elif typ == "image":
                    content_blocks.append(
                        _format_openai_image_block(block),
                    )
                elif typ == "audio":
                    if msg.role == "assistant":
                        continue
                    input_audio = _to_openai_audio_data(block["source"])
                    content_blocks.append(
                        {
                            "type": "input_audio",
                            "input_audio": input_audio,
                        },
                    )
                elif typ == "video":
                    content_blocks.append(
                        _format_openai_video_block(block),
                    )
                else:
                    logger.warning(
                        "Unsupported block type %s in the message, skipped.",
                        typ,
                    )

            msg_openai = {
                "role": msg.role,
                "name": msg.name,
                "content": content_blocks or None,
            }
            if tool_calls:
                msg_openai["tool_calls"] = tool_calls

            if msg_openai["content"] or msg_openai.get("tool_calls"):
                messages.append(msg_openai)

            i += 1

        return messages


__all__ = ["OpenAIVideoChatFormatter"]
