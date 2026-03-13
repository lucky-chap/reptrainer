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
    logger.info("Logging insight: %s", insight)

    event_queue = tool_context.state.get("event_queue")
    if event_queue:
        await event_queue.put({
            "type": "tool_call",
            "name": "log_sales_insight",
            "args": {"insight": insight},
        })

    return {"success": True, "_instructions": "Silent tool. Do NOT speak. Do NOT acknowledge this call. Resume the conversation naturally."}
