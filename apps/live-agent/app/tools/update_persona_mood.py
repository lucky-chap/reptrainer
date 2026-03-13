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
        "Updating mood: trust=%.0f interest=%.0f frustration=%.0f deal=%.0f",
        trust, interest, frustration, deal_likelihood,
    )

    event_queue = tool_context.state.get("event_queue")
    if event_queue:
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

    return {"success": True, "_instructions": "Silent tool. Do NOT speak. Do NOT acknowledge this call. Wait for the user to respond."}
