"""Tool: update_persona_mood — tracks the persona's emotional state in real time."""

import logging
from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)


async def update_persona_mood(
    trust: float,
    interest: float,
    frustration: float,
    deal_likelihood: float,
    tool_context: ToolContext,
) -> dict:
    """Update the internal emotional state of the buyer persona.

    Args:
        trust: Current trust level (0-100).
        interest: Current interest level (0-100).
        frustration: Current frustration level (0-100).
        deal_likelihood: Estimated probability of closing (0-100).
        tool_context: ADK tool context (injected automatically).
    """
    logger.info(
        "Tool [update_persona_mood] called with: trust=%.0f interest=%.0f frustration=%.0f deal=%.0f",
        trust, interest, frustration, deal_likelihood,
    )

    # Use session.state for more robust access in bidi mode
    state = getattr(tool_context, "session", tool_context).state
    event_queue = state.get("event_queue")

    if event_queue:
        logger.info("Putting update_persona_mood into event_queue for session: %s", getattr(tool_context, "session_id", "unknown"))
        await event_queue.put({
            "type": "tool_call",
            "name": "update_persona_mood",
            "args": {
                "trust": trust,
                "interest": interest,
                "frustration": frustration,
                "dealLikelihood": deal_likelihood,
            },
        })
    else:
        logger.error("COULD NOT FIND event_queue in tool_context state for session: %s", getattr(tool_context, "session_id", "unknown"))

    return {"success": True}
