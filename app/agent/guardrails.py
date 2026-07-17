"""
Security guardrails for the agent's database access.

Enforces the least-privilege, read-only principle from the system
architecture: the agent may only SELECT. Any attempt to modify data
(INSERT/UPDATE/DELETE/DROP/ALTER/etc.) is rejected before it reaches
the database engine.
"""

import re

from app.utils.logger import get_logger

logger = get_logger(__name__)

# Keywords that indicate a data-modifying or structural operation.
FORBIDDEN_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
    "TRUNCATE", "MERGE", "EXEC", "EXECUTE", "GRANT", "REVOKE",
    "INTO",  # blocks SELECT ... INTO (creates tables)
]


class GuardrailError(Exception):
    """Raised when a query violates the read-only security policy."""


def validate_read_only(sql: str) -> None:
    """
    Validate that a SQL string is a safe, read-only SELECT.

    Args:
        sql: The SQL query the agent wants to run.

    Raises:
        GuardrailError: If the query is not read-only or looks unsafe.
    """
    if not sql or not sql.strip():
        raise GuardrailError("Empty query.")

    normalized = sql.strip().upper()

    # Must begin with SELECT or WITH (CTE) — nothing else is read-only.
    if not (normalized.startswith("SELECT") or normalized.startswith("WITH")):
        raise GuardrailError("Only SELECT queries are permitted.")

    # Reject forbidden keywords (whole-word match to avoid false hits
    # like 'CREATED_AT' matching 'CREATE').
    for keyword in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{keyword}\b", normalized):
            raise GuardrailError(f"Forbidden keyword detected: {keyword}")

    # Reject stacked queries (semicolon followed by more SQL).
    # Allow a single trailing semicolon.
    stripped = sql.strip().rstrip(";")
    if ";" in stripped:
        raise GuardrailError("Multiple statements are not allowed.")

    logger.info("SQL passed read-only guardrail.")