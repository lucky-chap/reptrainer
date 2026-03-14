"""Background transcript analysis using the text model.

Runs alongside the live audio session. After each AI turn completes, it
analyzes the accumulated transcript and emits insight/objection/mood events
to the client via the shared event_queue — without interrupting the Gemini
Live audio stream (no function calls on the live agent).
"""

import asyncio
import json
import logging
from google import genai

from config import settings

logger = logging.getLogger(__name__)

# Reuse a single client for all analysis calls
_client = genai.Client(vertexai=True, project=settings.GOOGLE_CLOUD_PROJECT, location=settings.GOOGLE_CLOUD_LOCATION)

ANALYSIS_PROMPT = """You are a world-class sales coach observing a live sales call in real time.

Analyze the latest exchange in the transcript below and return a JSON object with these fields:

{{
  "insight": "A short, actionable coaching tip addressed directly to the sales rep using 'you'. Focus on what they should do NEXT, not what already happened. If there is nothing noteworthy, set to null.",
  "objection": null or {{ "objectionType": "...", "repResponse": "...", "sentiment": "positive|neutral|negative" }},
  "mood": {{ "trust": 0-100, "interest": 0-100, "frustration": 0-100, "dealLikelihood": 0-100 }}
}}

Rules:
- "insight" should be a proactive, real-time tip (e.g. "Pivot to ROI now", "You're rambling — ask a question"). Set to null if nothing stands out.
- "objection" should only be set if the buyer raised a NEW objection in the latest exchange. Do not repeat previously logged objections.
- "mood" should reflect the buyer's CURRENT emotional state based on the full conversation so far.
- Return ONLY valid JSON, no markdown, no explanation.

Previous objections already logged (do not repeat):
{previous_objections}

Transcript:
{transcript}"""


async def run_analysis(
    transcript_lines: list[str],
    previous_objections: list[str],
    event_queue: asyncio.Queue,
):
    """Run a single analysis pass on the transcript and push events."""
    if len(transcript_lines) < 2:
        return previous_objections

    transcript_text = "\n".join(transcript_lines)
    objections_text = "\n".join(previous_objections) if previous_objections else "(none)"

    prompt = ANALYSIS_PROMPT.format(
        transcript=transcript_text,
        previous_objections=objections_text,
    )

    try:
        response = await _client.aio.models.generate_content(
            model=settings.TEXT_MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=1024,
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "insight": {
                            "type": "STRING",
                            "nullable": True,
                        },
                        "objection": {
                            "type": "OBJECT",
                            "nullable": True,
                            "properties": {
                                "objectionType": {"type": "STRING"},
                                "repResponse": {"type": "STRING"},
                                "sentiment": {"type": "STRING"},
                            },
                        },
                        "mood": {
                            "type": "OBJECT",
                            "properties": {
                                "trust": {"type": "INTEGER"},
                                "interest": {"type": "INTEGER"},
                                "frustration": {"type": "INTEGER"},
                                "dealLikelihood": {"type": "INTEGER"},
                            },
                        },
                    },
                },
            ),
        )

        result = json.loads(response.text)

        # Emit insight
        if result.get("insight"):
            await event_queue.put({
                "type": "tool_call",
                "name": "log_sales_insight",
                "args": {"insight": result["insight"]},
            })

        # Emit objection (only if new)
        objection = result.get("objection")
        if objection and isinstance(objection, dict) and objection.get("objectionType"):
            previous_objections.append(objection["objectionType"])
            await event_queue.put({
                "type": "tool_call",
                "name": "log_objection",
                "args": {
                    "objectionType": objection["objectionType"],
                    "repResponse": objection.get("repResponse", ""),
                    "sentiment": objection.get("sentiment", "neutral"),
                },
            })

        # Emit mood
        mood = result.get("mood")
        if mood and isinstance(mood, dict):
            await event_queue.put({
                "type": "tool_call",
                "name": "update_persona_mood",
                "args": {
                    "trust": mood.get("trust", 50),
                    "interest": mood.get("interest", 50),
                    "frustration": mood.get("frustration", 20),
                    "dealLikelihood": mood.get("dealLikelihood", 30),
                },
            })

    except json.JSONDecodeError as e:
        logger.warning("Analysis returned invalid JSON: %s", e)
    except Exception as e:
        logger.error("Background analysis failed: %s", e, exc_info=True)

    return previous_objections
