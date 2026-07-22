import operator
from typing import Annotated, TypedDict
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    facts: Annotated[list[dict], operator.add]   # structured figures from workers
    final_answer: str                            # owner-facing text (CFO only)
    iteration: int