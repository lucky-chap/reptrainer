"""Tool: research_competitor — researches competitors via cache or live Google Search.

Mirrors the logic in apps/api/src/services/adk-tools.ts exactly:
1. Check knowledgeMetadata.competitorContexts cache (fuzzy name match)
2. If not cached and search_count < 4, run live search via vertex_search.py
3. Increment search_count in session state
"""

import logging
from google.adk.tools import ToolContext
from vertex_search import research_competitor_live

logger = logging.getLogger(__name__)

MAX_SEARCHES_PER_SESSION = 4


async def research_competitor(
    competitor_name: str,
    tool_context: ToolContext,
) -> dict:
    """Research a specific competitor or market claim.

    Use this ONLY when your internal memory (RAG) lacks the specific data
    needed to challenge the sales rep. Valid triggers include: verifying
    competitor claims, challenging differentiation, checking pricing/ROI
    models, investigating new competitors, validating integrations,
    researching product announcements, or evaluating market reputation.

    Args:
        competitor_name: The name of the competitor or topic to research.
        tool_context: ADK tool context (injected automatically).
    """
    logger.info("Tool [research_competitor] called with: competitor_name='%s'", competitor_name)

    # Use session.state for more robust access in bidi mode
    state = getattr(tool_context, "session", tool_context).state
    event_queue = state.get("event_queue")

    async def _emit(name: str, args: dict):
        if event_queue:
            await event_queue.put({"type": "tool_call", "name": name, "args": args})

    if event_queue:
        logger.info("Putting research_competitor into event_queue for session: %s", getattr(tool_context, "session_id", "unknown"))
        await _emit("research_competitor", {"competitorName": competitor_name})
    else:
        logger.error("COULD NOT FIND event_queue in tool_context state for session: %s", getattr(tool_context, "session_id", "unknown"))

    # 1. Check cache in knowledgeMetadata
    metadata = state.get("metadata")
    if metadata and metadata.get("competitorContexts"):
        name_lower = competitor_name.lower()
        for ctx in metadata["competitorContexts"]:
            cached_name = ctx.get("name", "").lower()
            if name_lower in cached_name or cached_name in name_lower:
                logger.info(
                    "Found '%s' in knowledge base cache", competitor_name
                )
                await _emit("research_complete", {"competitorName": competitor_name})
                return ctx

    # 2. Check search limit
    search_count = state.get("search_count", 0)
    if search_count >= MAX_SEARCHES_PER_SESSION:
        logger.info("Search limit reached (%d)", search_count)
        await _emit("research_complete", {"competitorName": competitor_name})
        return {
            "error": "Search limit reached for this session. "
            "Use your internal knowledge or RAG data instead."
        }

    # 3. Live search
    try:
        result = await research_competitor_live(competitor_name)
        state["search_count"] = search_count + 1
        logger.info(
            "Live search successful. New count: %d", search_count + 1
        )
        await _emit("research_complete", {"competitorName": competitor_name})
        return result
    except Exception as e:
        logger.error("Live search failed for %s: %s", competitor_name, e)
        await _emit("research_complete", {"competitorName": competitor_name})
        return {"error": f"Failed to research competitor: {e}"}
