"""Tool: log_sales_insight — records coaching insights during live calls."""

import logging
from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)


async def log_sales_insight(insight: str, tool_context: ToolContext) -> dict:
    """Record a key insight or moment from the sales call for later review.

    Args:
        insight: The description of the sales insight, addressed to the user.
        tool_context: ADK tool context (injected automatically).
    """
    logger.info("Tool [log_sales_insight] called with: insight='%s'", insight)

    # Use session.state for more robust access in bidi mode
    state = getattr(tool_context, "session", tool_context).state
    event_queue = state.get("event_queue")

    if event_queue:
        logger.info("Putting log_sales_insight into event_queue for session: %s", getattr(tool_context, "session_id", "unknown"))
        await event_queue.put({
            "type": "tool_call",
            "name": "log_sales_insight",
            "args": {"insight": insight},
        })
    else:
        logger.error("COULD NOT FIND event_queue in tool_context state for session: %s", getattr(tool_context, "session_id", "unknown"))

    return {"success": True}
