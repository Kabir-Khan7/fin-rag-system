"""
The agent's tools: SQL_Executor and Vector_Retriever.

These are the concrete capabilities the agent can invoke. SQL is for exact
numbers (Gold metric tables); vector search is for semantic context. Every
SQL query passes the read-only guardrail first.
"""

import json

from sqlalchemy import text

from app.database.session import SessionLocal
from app.agent.guardrails import validate_read_only, GuardrailError
from app.vector.search import semantic_search
from app.utils.logger import get_logger

logger = get_logger(__name__)


def sql_executor(query: str) -> str:
    """
    Execute a read-only SQL query against the Gold metric tables.

    Use for exact numbers: balances, cash position, vendor spend, runway,
    monthly summaries, payables aging. Only SELECT queries are allowed.

    Args:
        query: A SELECT query against the gold_* tables.

    Returns:
        A JSON string of result rows, or an error message.
    """
    try:
        validate_read_only(query)
    except GuardrailError as exc:
        logger.warning("Guardrail blocked query: %s", exc)
        return f"Query rejected by security guardrail: {exc}"

    db = SessionLocal()
    try:
        rows = db.execute(text(query)).fetchall()
        # Convert rows to a list of dicts (column name -> value).
        results = [dict(row._mapping) for row in rows]
        # Serialize (default=str handles Decimal/datetime).
        return json.dumps(results, default=str)
    except Exception as exc:
        logger.error("SQL execution error: %s", exc)
        return f"SQL error: {exc}"
    finally:
        db.close()


def vector_retriever(query: str, source_type: str | None = None) -> str:
    """
    Semantic search over financial documents (invoices, transactions).

    Use for meaning-based questions: finding transactions/invoices related
    to a concept, vendor context, or narrative descriptions.

    Args:
        query: Natural-language search text.
        source_type: Optional filter — 'invoice' or 'subledger'.

    Returns:
        A JSON string of the top matching documents.
    """
    try:
        results = semantic_search(query, limit=5, source_type=source_type)
        payload = [
            {
                "score": round(r.score, 3),
                "source_type": r.source_type,
                "content": r.content_text,
            }
            for r in results
        ]
        return json.dumps(payload, default=str)
    except Exception as exc:
        logger.error("Vector search error: %s", exc)
        return f"Vector search error: {exc}"