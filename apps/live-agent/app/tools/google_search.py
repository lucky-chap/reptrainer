"""Tool: google_search — quick web search via Gemini + Google Search grounding.

Unlike the ADK built-in GoogleSearchTool (which becomes a sub-agent in
multi-tool setups and breaks live/bidi mode), this is a plain function tool
that calls the Gemini text API with Google Search grounding directly — the
same pattern used by research_competitor / vertex_search.py.
"""

import logging

from google import genai
from google.adk.tools import ToolContext
from google.genai import types

from config import settings

logger = logging.getLogger(__name__)


async def google_search(
    query: str,
    tool_context: ToolContext,
) -> str:
    """Search the web for current information, facts, or data.

    Use this when you need to look up facts, industry data, recent news,
    pricing information, or anything you don't already know. Keep queries
    brief and specific.

    Args:
        query: The search query — be specific and concise.
        tool_context: ADK tool context (injected automatically).
    """
    logger.info("Tool [google_search] called with: query='%s'", query)

    try:
        client = genai.Client(
            vertexai=True,
            project=settings.GOOGLE_CLOUD_PROJECT,
            location=settings.GOOGLE_CLOUD_LOCATION,
        )

        response = await client.aio.models.generate_content(
            model=settings.TEXT_MODEL,
            contents=f"Answer this query concisely based on web search results: {query}",
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )

        result = response.text or "No results found."
        logger.info("Tool [google_search] result length: %d chars", len(result))
        return result
    except Exception as e:
        logger.error("Tool [google_search] failed for query '%s': %s", query, e)
        return f"Search unavailable. Use your existing knowledge instead."
