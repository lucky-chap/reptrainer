"""Firebase Admin Firestore client for reading knowledge metadata."""

import asyncio
from functools import lru_cache

import firebase_admin
from firebase_admin import firestore

_app: firebase_admin.App | None = None


def _get_db() -> firestore.firestore.Client:
    """Get or create the Firestore client (singleton)."""
    global _app
    if _app is None:
        # Uses Application Default Credentials (ADC)
        _app = firebase_admin.initialize_app()
    return firestore.client(_app)


@lru_cache(maxsize=1)
def _db():
    return _get_db()


async def get_knowledge_metadata(team_id: str) -> dict | None:
    """Read KnowledgeMetadata from Firestore for a team.

    Mirrors the TypeScript getKnowledgeMetadata() in knowledge.ts.
    Runs the synchronous Firestore call in a thread executor to avoid
    blocking the FastAPI event loop.
    """
    if not team_id:
        return None

    def _read():
        db = _db()
        doc = db.collection("knowledgeMetadata").document(team_id).get()
        return doc.to_dict() if doc.exists else None

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _read)
