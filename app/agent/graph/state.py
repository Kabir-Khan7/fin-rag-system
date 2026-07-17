"""
Shared state for the Neural Ledger agent graph.

State flows through every node. Control fields (iteration, current_agent)
are managed by deterministic code, NOT the LLM — this is what keeps a small
local model reliable.
"""

from typing import Annotated
from operator import add

from langgraph.graph import MessagesState


class AgentState(MessagesState):
    """
    Graph state, extending MessagesState (which provides `messages`).

    - messages: the conversation (from MessagesState)
    - iteration: hard-capped in Python to prevent runaway loops
    - escalations: findings that bubble up the hierarchy (append-only)
    - final_answer: the owner-facing text (only the CFO sets this)
    """

    iteration: int
    escalations: Annotated[list[str], add]
    final_answer: str