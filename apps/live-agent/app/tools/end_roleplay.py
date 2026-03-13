"""Tool: end_roleplay — signals the end of a roleplay session."""

import logging
from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)


async def end_roleplay(tool_context: ToolContext) -> dict:
    """End the sales roleplay session. Called when the buyer persona
    decides to end the meeting.

    Args:
        tool_context: ADK tool context (injected automatically).
    """
    logger.info("Ending roleplay session")

    event_queue = tool_context.state.get("event_queue")
    if event_queue:
        await event_queue.put({
            "type": "tool_call",
            "name": "end_roleplay",
            "args": {},
        })

    # Signal downstream to close gracefully
    tool_context.state["session_ended"] = True

    return {"success": True}
