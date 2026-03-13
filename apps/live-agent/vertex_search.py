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
        ),
    )

    text = response.text or ""

    # Extract JSON from response
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        logger.warning(
            "No JSON found in competitor research response for %s",
            competitor_name,
        )
        return {
            "name": competitor_name,
            "website": "",
            "productDescription": f"Information about {competitor_name}",
            "targetCustomer": "Unknown",
            "pricingPositioning": "Unknown",
            "painPoints": [],
            "complaints": [],
        }

    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON for competitor %s", competitor_name)
        return {
            "name": competitor_name,
            "website": "",
            "productDescription": text[:500],
            "targetCustomer": "Unknown",
            "pricingPositioning": "Unknown",
            "painPoints": [],
            "complaints": [],
        }
