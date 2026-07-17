"""
Semantic search over the financial documents in Qdrant.

Embeds a query with the same local model, then retrieves the most similar
documents — optionally constrained by metadata filters (vendor, amount,
date, source type). This is the foundation the agent's Vector_Retriever
will build on.
"""

from dataclasses import dataclass

from qdrant_client.models import Filter, FieldCondition, MatchValue, Range

from app.vector.qdrant_client import get_qdrant_client
from app.vector.embedder import embed_texts
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SearchResult:
    """One semantic search hit."""

    doc_id: int
    score: float
    source_type: str
    content_text: str
    payload: dict


def semantic_search(
    query: str,
    limit: int = 5,
    source_type: str | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
) -> list[SearchResult]:
    """
    Search for documents semantically similar to the query.

    Args:
        query: Natural-language search text.
        limit: Max results to return.
        source_type: Optional filter ('invoice' or 'subledger').
        min_amount / max_amount: Optional amount range filter.

    Returns:
        A list of SearchResult ordered by similarity (highest first).
    """
    client = get_qdrant_client()

    # Embed the query with the same model used for documents.
    query_vector = embed_texts([query])[0]

    # Build optional metadata filters.
    conditions = []
    if source_type:
        conditions.append(
            FieldCondition(key="source_type", match=MatchValue(value=source_type))
        )
    if min_amount is not None or max_amount is not None:
        conditions.append(
            FieldCondition(
                key="amount",
                range=Range(gte=min_amount, lte=max_amount),
            )
        )

    query_filter = Filter(must=conditions) if conditions else None

    response = client.query_points(
        collection_name=settings.QDRANT_COLLECTION,
        query=query_vector,
        query_filter=query_filter,
        limit=limit,
    )
    hits = response.points

    results = [
        SearchResult(
            doc_id=hit.id,
            score=hit.score,
            source_type=hit.payload.get("source_type", "unknown"),
            content_text=hit.payload.get("content_text", ""),
            payload=hit.payload,
        )
        for hit in hits
    ]
    logger.info("Search '%s' returned %d hits.", query, len(results))
    return results