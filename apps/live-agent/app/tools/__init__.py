"""ADK tool functions for the Reptrainer live roleplay session.

Each tool is a plain async function. ADK wraps them as FunctionTool automatically
when passed to an Agent's tools list.

Tools that emit events to the frontend use an asyncio.Queue stored in
tool_context.state["event_queue"]. The main.py downstream relay task reads
from this queue and forwards events over the client WebSocket.
"""

from tools.log_sales_insight import log_sales_insight
from tools.log_objection import log_objection
from tools.update_persona_mood import update_persona_mood
from tools.end_roleplay import end_roleplay
from tools.research_competitor import research_competitor
from tools.google_search import google_search

__all__ = [
    "log_sales_insight",
    "log_objection",
    "update_persona_mood",
    "end_roleplay",
    "research_competitor",
    "google_search",
]
