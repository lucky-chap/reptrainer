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
    logger.info("Tool [end_roleplay] called")

    # Use session.state for more robust access in bidi mode
    state = getattr(tool_context, "session", tool_context).state
    event_queue = state.get("event_queue")

    if event_queue:
        logger.info("Putting end_roleplay into event_queue for session: %s", getattr(tool_context, "session_id", "unknown"))
        await event_queue.put({
            "type": "tool_call",
            "name": "end_roleplay",
            "args": {},
        })
    else:
        logger.error("COULD NOT FIND event_queue in tool_context state for session: %s", getattr(tool_context, "session_id", "unknown"))

    # Signal downstream to close gracefully
    state["session_ended"] = True

    return {"success": True}
