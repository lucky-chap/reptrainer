"""Tool: log_objection — tracks objections raised during the roleplay."""

import logging
from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)


async def log_objection(
    objection_type: str,
    rep_response: str,
    sentiment: str,
    tool_context: ToolContext,
) -> dict:
    """Log a specific objection raised by the persona and how the rep handled it.

    Args:
        objection_type: The type/category of the objection.
        rep_response: How the sales rep responded to the objection.
        sentiment: The sentiment of the response — "positive", "neutral", or "negative".
        tool_context: ADK tool context (injected automatically).
    """
    logger.info("Tool [log_objection] called with: type='%s', sentiment='%s'", objection_type, sentiment)

    # Use session.state for more robust access in bidi mode
    state = getattr(tool_context, "session", tool_context).state
    event_queue = state.get("event_queue")

    if event_queue:
        logger.info("Putting log_objection into event_queue for session: %s", getattr(tool_context, "session_id", "unknown"))
        await event_queue.put({
            "type": "tool_call",
            "name": "log_objection",
            "args": {
                "objectionType": objection_type,
                "repResponse": rep_response,
                "sentiment": sentiment,
            },
        })
    else:
        logger.error("COULD NOT FIND event_queue in tool_context state for session: %s", getattr(tool_context, "session_id", "unknown"))

    return {"success": True}
