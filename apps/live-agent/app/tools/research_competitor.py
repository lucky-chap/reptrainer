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
    logger.info("Researching competitor: %s", competitor_name)

    # Emit tool_call event to frontend
    event_queue = tool_context.state.get("event_queue")
    if event_queue:
        await event_queue.put({
            "type": "tool_call",
            "name": "research_competitor",
            "args": {"competitorName": competitor_name},
        })

    # 1. Check cache in knowledgeMetadata
    metadata = tool_context.state.get("knowledge_metadata")
    if metadata and metadata.get("competitorContexts"):
        name_lower = competitor_name.lower()
        for ctx in metadata["competitorContexts"]:
            cached_name = ctx.get("name", "").lower()
            if name_lower in cached_name or cached_name in name_lower:
                logger.info(
                    "Found '%s' in knowledge base cache", competitor_name
                )
                return ctx

    # 2. Check search limit
    search_count = tool_context.state.get("search_count", 0)
    if search_count >= MAX_SEARCHES_PER_SESSION:
        logger.info("Search limit reached (%d)", search_count)
        return {
            "error": "Search limit reached for this session. "
            "Use your internal knowledge or RAG data instead."
        }

    # 3. Live search
    try:
        result = await research_competitor_live(competitor_name)
        tool_context.state["search_count"] = search_count + 1
        logger.info(
            "Live search successful. New count: %d", search_count + 1
        )
        return result
    except Exception as e:
        logger.error("Live search failed for %s: %s", competitor_name, e)
        return {"error": f"Failed to research competitor: {e}"}
