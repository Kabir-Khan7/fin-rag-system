"""
Interactive AI CFO — ask financial questions in natural language.

Usage (venv active, Ollama + Qdrant running):
    python ask_cfo.py
"""

from app.agent.react_agent import ask_agent


SAMPLE_QUESTIONS = [
    "What's my current cash runway?",
    "Who are my top 3 vendors by spend?",
    "How much do I owe in total payables?",
]


def main() -> None:
    print("=" * 55)
    print("AI CFO — ask a financial question (or 'quit')")
    print("=" * 55)
    print("Sample questions:")
    for q in SAMPLE_QUESTIONS:
        print(f"  • {q}")
    print()

    while True:
        question = input("You: ").strip()
        if question.lower() in ("quit", "exit", "q", ""):
            print("Goodbye.")
            break

        print("\n(thinking...)\n")
        result = ask_agent(question)

        print(f"CFO: {result.answer}")
        print(f"\n[used {len(result.tool_calls)} tool call(s) over "
              f"{result.iterations} iteration(s)]")
        if result.hit_limit:
            print("[note: hit reasoning limit]")
        print("-" * 55)


if __name__ == "__main__":
    main()