"""
ReAct agent: the reasoning core of the AI CFO.

Implements the Plan -> Act -> Observe -> Evaluate -> Repeat loop from the
system architecture. The agent (Qwen3 via Ollama) decides which tools to
call, observes their results, and iterates until it can answer — bounded
by a strict maximum iteration count to prevent runaway loops.
"""

import json
from dataclasses import dataclass, field

import ollama

from app.agent.tools import sql_executor, vector_retriever
from app.agent.schema_context import GOLD_SCHEMA_DESCRIPTION
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

MODEL = settings.AGENT_MODEL
MAX_ITERATIONS = 5  # Safety limit from the architecture doc.


# Tool schemas the model sees.
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "sql_executor",
            "description": (
                "Run a read-only SQL SELECT query for EXACT numbers: account "
                "balances, cash position, vendor spend, cash runway, monthly "
                "income/expense, payables aging. Returns JSON rows."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "A SELECT query against the gold_* tables.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "vector_retriever",
            "description": (
                "Semantic search over invoices and transactions for MEANING-based "
                "questions (e.g. find items related to a concept, vendor context, "
                "descriptions). Returns matching documents."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural-language search text."},
                    "source_type": {
                        "type": "string",
                        "description": "Optional filter: 'invoice' or 'subledger'.",
                    },
                },
                "required": ["query"],
            },
        },
    },
]

# Map tool names to their Python functions.
TOOL_FUNCTIONS = {
    "sql_executor": sql_executor,
    "vector_retriever": vector_retriever,
}


SYSTEM_PROMPT = f"""You are an AI CFO assistant for a small business. You answer \
financial questions using ONLY the data available through your tools. Never invent \
numbers — always retrieve them.

Use sql_executor for exact figures (balances, cash, spend, runway, aging).
Use vector_retriever for meaning-based lookups (finding related invoices/transactions).

{GOLD_SCHEMA_DESCRIPTION}

When you have enough information, give a clear, concise answer with the actual numbers. \
Every figure you state must come from a tool result. If the data doesn't answer the \
question, say so honestly."""


@dataclass
class AgentResult:
    """The outcome of an agent run."""

    answer: str
    iterations: int
    tool_calls: list[dict] = field(default_factory=list)
    hit_limit: bool = False


def ask_agent(question: str) -> AgentResult:
    """
    Answer a financial question using the ReAct loop.

    Args:
        question: The user's financial question.

    Returns:
        AgentResult with the final answer and a trace of tool calls.
    """
    logger.info("=== Agent question: %s ===", question)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]

    result = AgentResult(answer="", iterations=0)

    for iteration in range(1, MAX_ITERATIONS + 1):
        result.iterations = iteration
        logger.info("--- Iteration %d ---", iteration)

        # PLAN + decide: send conversation and tools to the model.
        response = ollama.chat(model=MODEL, messages=messages, tools=TOOLS)
        message = response["message"]

        # Add the model's message to the conversation.
        messages.append(message)

        tool_calls = message.get("tool_calls")

        # EVALUATE: no tool call means the model is giving its final answer.
        if not tool_calls:
            result.answer = message.get("content", "").strip()
            logger.info("Agent produced final answer at iteration %d.", iteration)
            return result

        # ACT: execute each requested tool, OBSERVE the result.
        for call in tool_calls:
            fn_name = call["function"]["name"]
            fn_args = call["function"]["arguments"]
            logger.info("Tool call: %s(%s)", fn_name, fn_args)

            func = TOOL_FUNCTIONS.get(fn_name)
            if func is None:
                observation = f"Unknown tool: {fn_name}"
            else:
                observation = func(**fn_args)

            result.tool_calls.append({"tool": fn_name, "args": fn_args})

            # Feed the observation back into the conversation.
            messages.append({
                "role": "tool",
                "content": observation,
            })

    # Hit the iteration limit without a final answer.
    result.hit_limit = True
    result.answer = (
        "I reached my reasoning limit before fully answering. Here's what I "
        "gathered — please refine your question or ask for a specific metric."
    )
    logger.warning("Agent hit the %d-iteration safety limit.", MAX_ITERATIONS)
    return result