"""Competitor research using Gemini + Google Search grounding.

Mirrors the researchCompetitor() function in apps/api/src/services/vertex.ts.
"""

import json
import logging
import re

from google import genai
from google.genai import types

from config import settings

logger = logging.getLogger(__name__)


async def research_competitor_live(competitor_name: str) -> dict:
    """Research a competitor using Gemini with Google Search grounding.

    Returns a dict with keys: name, website, productDescription,
    targetCustomer, pricingPositioning, painPoints, complaints.
    """
    client = genai.Client(
        vertexai=True,
        project=settings.GOOGLE_CLOUD_PROJECT,
        location=settings.GOOGLE_CLOUD_LOCATION,
    )

    prompt = f"""Research the competitor: {competitor_name}
Identify their:
1. Official website URL.
2. Product description and core value proposition.
3. Target customer segments.
4. Pricing positioning (enterprise, budget, mid-market).
5. Common customer pain points or limitations.
6. Frequent customer complaints from review sites.

Generate a competitor analysis with the following JSON structure. Return ONLY valid JSON:
{{
    "name": "{competitor_name}",
    "website": "...",
    "productDescription": "...",
    "targetCustomer": "...",
    "pricingPositioning": "...",
    "painPoints": ["..."],
    "complaints": ["..."]
}}"""

    response = await client.aio.models.generate_content(
        model=settings.TEXT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            response_mime_type="application/json",
            response_schema={
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "website": {"type": "STRING"},
                    "productDescription": {"type": "STRING"},
                    "targetCustomer": {"type": "STRING"},
                    "pricingPositioning": {"type": "STRING"},
                    "painPoints": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"}
                    },
                    "complaints": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"}
                    }
                }
            }
        ),
    )

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON for competitor %s", competitor_name)
        return {
            "name": competitor_name,
            "website": "",
            "productDescription": str(response.text)[:500] if response.text else "",
            "targetCustomer": "Unknown",
            "pricingPositioning": "Unknown",
            "painPoints": [],
            "complaints": [],
        }
