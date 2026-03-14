"""ADK Agent, Runner, and SessionService singletons.

Built ONCE at application startup and shared across all WebSocket connections.
The agent's instruction is a callable that reads the per-session system prompt
from session.state["system_prompt"], so a single Agent instance serves all
persona configurations.
"""

import logging
import os

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from config import settings
from tools import (
    end_roleplay,
    log_objection,
    log_sales_insight,
    research_competitor,
    update_persona_mood,
)

logger = logging.getLogger(__name__)

# ── Session Service ──────────────────────────────────────────────────────────
session_service = InMemorySessionService()

# ── Configure Vertex AI via environment ──────────────────────────────────────
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", settings.GOOGLE_CLOUD_PROJECT)
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", settings.GOOGLE_CLOUD_LOCATION)
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")

# ── Agent ────────────────────────────────────────────────────────────────────
agent = Agent(
    name="persona_agent",
    model=settings.LIVE_MODEL,
    tools=[
        research_competitor,
        end_roleplay,
        log_objection,
        log_sales_insight,
        update_persona_mood,
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
