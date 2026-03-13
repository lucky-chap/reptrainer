"""ADK Agent, Runner, and SessionService singletons.

Built ONCE at application startup and shared across all WebSocket connections.
The agent's instruction is a callable that reads the per-session system prompt
from session.state["system_prompt"], so a single Agent instance serves all
persona configurations.
"""

import logging
import os

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from config import settings
from tools import (
    log_sales_insight,
    log_objection,
    update_persona_mood,
    end_roleplay,
    research_competitor,
)

logger = logging.getLogger(__name__)

# ── Session Service ──────────────────────────────────────────────────────────
# Use InMemorySessionService for now (single-process uvicorn).
# For production multi-process, switch to VertexAiSessionService:
#   from google.adk.sessions import VertexAiSessionService
#   session_service = VertexAiSessionService(
#       project=settings.GOOGLE_CLOUD_PROJECT,
#       location=settings.GOOGLE_CLOUD_LOCATION,
#   )
session_service = InMemorySessionService()

# ── Configure Vertex AI via environment ──────────────────────────────────────
# ADK reads these environment variables automatically:
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", settings.GOOGLE_CLOUD_PROJECT)
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", settings.GOOGLE_CLOUD_LOCATION)
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")

# ── Agent ────────────────────────────────────────────────────────────────────
agent = LlmAgent(
    name="persona_agent",
    model=settings.LIVE_MODEL,
    tools=[
        research_competitor,
        log_sales_insight,
        log_objection,
        update_persona_mood,
        end_roleplay,
    ],
    # Per-session instruction: reads from session state so each connection
    # gets its own persona system prompt without rebuilding the agent.
    instruction=lambda ctx: ctx.state.get("system_prompt", "You are a buyer persona."),
)

# ── Runner ───────────────────────────────────────────────────────────────────
APP_NAME = "reptrainer"

runner = Runner(
    app_name=APP_NAME,
    agent=agent,
    session_service=session_service,
)

logger.info(
    "ADK Agent initialized — model=%s, tools=%d",
    settings.LIVE_MODEL,
    len(agent.tools),
)
