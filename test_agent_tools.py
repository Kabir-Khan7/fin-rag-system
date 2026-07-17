"""Verify the agent's tools work and the guardrail blocks unsafe SQL."""

from app.agent.tools import sql_executor, vector_retriever
from app.agent.guardrails import validate_read_only, GuardrailError


def main() -> None:
    print("1. SQL tool — valid query:")
    print("  ", sql_executor("SELECT TOP 3 Vendor_Name, total_spend FROM dbo.gold_vendor_spend ORDER BY total_spend DESC"))

    print("\n2. SQL tool — guardrail should BLOCK this:")
    print("  ", sql_executor("DROP TABLE dbo.gold_vendor_spend"))

    print("\n3. SQL tool — guardrail should BLOCK stacked query:")
    print("  ", sql_executor("SELECT 1; DELETE FROM dbo.gold_vendor_spend"))

    print("\n4. Vector tool — semantic search:")
    print("  ", vector_retriever("consulting services", source_type="invoice"))

    print("\n✓ Tools tested.")


if __name__ == "__main__":
    main()