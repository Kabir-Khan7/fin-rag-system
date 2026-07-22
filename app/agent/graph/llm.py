"""
Local LLM binding for the agent graph.

Qwen3 via Ollama, configured for reliability and speed on CPU: thinking
suppressed at the generation level (not just stripped from output), output
length capped, deterministic temperature.
"""

from langchain_ollama import ChatOllama

from app.core.config import settings


def get_llm() -> ChatOllama:
    """Return the configured local chat model for agent nodes."""
    return ChatOllama(
        model=settings.AGENT_MODEL,
        temperature=0,
        num_predict=800,      # cap output — synthesis needs 2-4 sentences
        num_ctx=4096,         # keep context small on CPU
    )