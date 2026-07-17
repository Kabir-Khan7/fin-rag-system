"""
Proof-of-concept: demonstrate both retrieval tracks working.

Track 1 (SQL): exact numbers from Gold metric tables.
Track 2 (Vector): semantic search over embedded documents.

This is the foundation the RAG agent will orchestrate.
"""

from sqlalchemy import text

from app.database.session import SessionLocal
from app.vector.search import semantic_search


def prove_sql_track() -> None:
    """Track 1: query a Gold metric table for an exact answer."""
    print("\n" + "=" * 55)
    print("TRACK 1 — SQL (exact numbers)")
    print("=" * 55)

    db = SessionLocal()
    try:
        # Example CFO question: "What's my cash runway?"
        row = db.execute(text("""
            SELECT current_cash, avg_monthly_burn, runway_months, status
            FROM dbo.gold_cash_runway
        """)).fetchone()

        if row:
            print(f"  Q: 'What's my cash runway?'")
            print(f"  → Cash: {row.current_cash}, Burn: {row.avg_monthly_burn}")
            print(f"  → Runway: {row.runway_months} months (status: {row.status})")

        # Example: "Who are my top 3 vendors by spend?"
        print(f"\n  Q: 'Top 3 vendors by spend?'")
        rows = db.execute(text("""
            SELECT TOP 3 Vendor_Name, total_spend
            FROM dbo.gold_vendor_spend
            ORDER BY total_spend DESC
        """)).fetchall()
        for r in rows:
            print(f"  → {r.Vendor_Name}: {r.total_spend}")
    finally:
        db.close()


def prove_vector_track() -> None:
    """Track 2: semantic search over embedded documents."""
    print("\n" + "=" * 55)
    print("TRACK 2 — Vector (semantic search)")
    print("=" * 55)

    # A meaning-based query — not exact keywords.
    query = "consulting services invoice"
    print(f"  Q: '{query}'")
    results = semantic_search(query, limit=3)
    for r in results:
        print(f"  → [{r.score:.3f}] {r.content_text[:90]}...")

    # Same search, but filtered to invoices only.
    print(f"\n  Q: '{query}' (filtered: invoices only)")
    results = semantic_search(query, limit=3, source_type="invoice")
    for r in results:
        print(f"  → [{r.score:.3f}] {r.content_text[:90]}...")


def main() -> None:
    prove_sql_track()
    prove_vector_track()
    print("\n" + "=" * 55)
    print("Both tracks working — foundation ready for the agent.")
    print("=" * 55)


if __name__ == "__main__":
    main()