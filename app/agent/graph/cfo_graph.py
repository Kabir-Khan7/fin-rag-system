"""
The AI CFO graph — deterministic hierarchy with one surgical LLM call.

Flow: Owner -> CFO intake (routing) -> Finance HOD (deterministic retrieval)
      -> CFO synthesis (the ONE LLM call, composes the owner's answer).

Numbers never pass through the model: workers emit structured facts, the LLM
writes narrative with placeholder tokens, and Python injects exact values.
"""

import re
import sqlite3

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver

from app.agent.graph.state import AgentState
from app.agent.graph.llm import get_llm
from app.agent.graph.hod import finance_hod_node
from app.agent.graph.finance_graph import strip_thinking
from app.utils.logger import get_logger

logger = get_logger(__name__)


# NOTE: no .format() is ever called on this string, so braces are safe.
CFO_SYNTHESIS_PROMPT = """/no_think
You are the AI CFO speaking directly to the business owner.

RULES:
- Refer to every figure ONLY by its token, written in curly braces exactly as listed below. Never write a raw number yourself — the system replaces tokens with exact values.
- Use ALL the tokens listed below — each was retrieved because it is relevant. Give 2-4 sentences: the headline figure first, then the supporting figures, then one line on what it implies.
- Clear, professional executive tone. No emojis. No greetings.
- Do not explain your reasoning. Output only the final answer.
- If a figure you need has no token listed, do not invent it — omit it."""


def cfo_intake_node(state: AgentState) -> dict:
    """CFO intake. Currently always finance. (Later: choose the right HOD here.)"""
    logger.info("AI CFO intake — routing to Finance.")
    return {}


def cfo_synthesis_node(state: AgentState) -> dict:
    """Compose the owner's answer: LLM writes narrative, Python injects figures."""
    logger.info("AI CFO — synthesizing (placeholder-injection mode).")
    facts = state.get("facts", [])

    if not facts:
        msg = "I couldn't gather the data for that. Could you rephrase?"
        return {"messages": [AIMessage(content=msg)], "final_answer": msg}

    # The fact menu the model sees — tokens and display strings, never asked to copy digits.
    facts_block = "\n".join(
        f"  {{{f['label']}}} = {f['display']}  "
        f"(from {f['source']['table']}.{f['source']['column']})"
        for f in facts
    )
    prompt = CFO_SYNTHESIS_PROMPT + "\n\nAvailable facts:\n" + facts_block

    llm = get_llm()
    raw = llm.invoke([
        SystemMessage(content=prompt),
        HumanMessage(content=state["messages"][-1].content),
    ])
    narrative = strip_thinking(raw.content)
    print("=== RAW MODEL OUTPUT ===")
    print(repr(raw.content))
    print("=== AFTER STRIP ===")
    print(repr(narrative))

    # DETERMINISTIC INJECTION — Python owns every number.
    lookup = {f["label"]: f["display"] for f in facts}

    def _sub(m):
        token = m.group(1)
        if token not in lookup:
            logger.warning("LLM referenced unknown token {%s} — left visible.", token)
            return m.group(0)   # surfaced, not silently wrong
        return lookup[token]

    answer = re.sub(r"\{(\w+)\}", _sub, narrative)

    # Provenance footer — source attribution per the architecture mandate.
    sources = sorted(
        {f"{f['source']['table']}.{f['source']['column']}" for f in facts}
    )
    answer += "\n\n— Sourced from: " + ", ".join(sources)

    return {"messages": [AIMessage(content=answer)], "final_answer": answer}


def build_cfo_graph():
    """Compile the deterministic CFO hierarchy."""
    graph = StateGraph(AgentState)

    graph.add_node("cfo_intake", cfo_intake_node)
    graph.add_node("finance_hod", finance_hod_node)
    graph.add_node("cfo_synthesis", cfo_synthesis_node)

    graph.add_edge(START, "cfo_intake")
    graph.add_edge("cfo_intake", "finance_hod")
    graph.add_edge("finance_hod", "cfo_synthesis")
    graph.add_edge("cfo_synthesis", END)

    conn = sqlite3.connect("agent_memory.db", check_same_thread=False)
    checkpointer = SqliteSaver(conn)
    return graph.compile(checkpointer=checkpointer)