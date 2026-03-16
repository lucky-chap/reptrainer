"""ADK Agent, Runner, and SessionService singletons.

Built ONCE at application startup and shared across all WebSocket connections.
The agent's instruction is a callable that reads the per-session persona data
from session state, so a single Agent instance serves all persona configs.
"""

import logging
import os

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from config import settings
from persona_engine import generate_prompt
from tools import (
    end_roleplay,
    google_search,
    research_competitor,
)

logger = logging.getLogger(__name__)

# ── Session Service ──────────────────────────────────────────────────────────
session_service = InMemorySessionService()

# ── Configure Vertex AI via environment ──────────────────────────────────────
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", settings.GOOGLE_CLOUD_PROJECT)
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", settings.GOOGLE_CLOUD_LOCATION)
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")

from google.adk.agents.readonly_context import ReadonlyContext

def get_rich_instruction(ctx: ReadonlyContext) -> str:
    """Build the system prompt from per-session persona + metadata stored in state."""
    persona = ctx.state.get("persona")
    if not persona:
        # Fallback: if frontend sent a pre-built systemPrompt (backwards compat)
        return ctx.state.get("system_prompt", "You are a buyer persona.")

    return generate_prompt(
        persona=persona,
        metadata=ctx.state.get("metadata"),
        scenario=ctx.state.get("scenario"),
        user_name=ctx.state.get("user_name"),
        company_name=ctx.state.get("company_name"),
    )

# ── Agent ────────────────────────────────────────────────────────────────────
agent = Agent(
    name="persona_agent",
    model=settings.LIVE_MODEL,
    tools=[
        research_competitor,
        end_roleplay,
        google_search,
    ],
    # Per-session instruction: reads from session state so each connection
    # gets its own persona system profile without rebuilding the agent.
    instruction=get_rich_instruction,
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
