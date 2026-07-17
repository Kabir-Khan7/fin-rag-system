"""Test the L0 LangGraph finance agent — should match the old ReAct loop."""

from langchain_core.messages import HumanMessage
from app.agent.graph.finance_graph import build_finance_graph


def main() -> None:
    app = build_finance_graph()
    config = {"configurable": {"thread_id": "test-1"}}

    question = "What's my current cash runway?"
    print(f"You: {question}\n(thinking...)\n")

    result = app.invoke(
        {"messages": [HumanMessage(content=question)], "iteration": 0},
        config=config,
    )

    # The last message is the agent's final answer.
    print(f"CFO: {result['messages'][-1].content}")


if __name__ == "__main__":
    main()