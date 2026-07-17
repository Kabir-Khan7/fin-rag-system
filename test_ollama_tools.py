"""
Proves that the local Qwen3 model can call tools via Ollama.

This is the foundational capability for the agent: the model must read a
tool schema, decide to call it, and emit structured arguments. If this
works, the ReAct agent is feasible.
"""

import ollama

MODEL = "qwen3:4b"


# A trivial tool the model can choose to call.
def get_account_balance(account_name: str) -> str:
    """Fake tool — returns a canned balance for a named account."""
    fake_balances = {
        "cash": "142,883.72",
        "revenue": "123,593.06",
    }
    return fake_balances.get(account_name.lower(), "account not found")


# The tool schema the model sees.
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_account_balance",
            "description": "Get the current balance for a named financial account.",
            "parameters": {
                "type": "object",
                "properties": {
                    "account_name": {
                        "type": "string",
                        "description": "The account name, e.g. 'cash' or 'revenue'.",
                    },
                },
                "required": ["account_name"],
            },
        },
    }
]


def main() -> None:
    print("Asking the model a question that should trigger a tool call...\n")

    # Step 1: Ask a question that requires the tool.
    response = ollama.chat(
        model=MODEL,
        messages=[{"role": "user", "content": "What is my cash balance?"}],
        tools=tools,
    )

    message = response["message"]

    # Step 2: Did the model decide to call the tool?
    if message.get("tool_calls"):
        for call in message["tool_calls"]:
            fn_name = call["function"]["name"]
            fn_args = call["function"]["arguments"]
            print(f"✓ Model called tool: {fn_name}")
            print(f"  Arguments: {fn_args}")

            # Step 3: Execute the tool and show the result.
            if fn_name == "get_account_balance":
                result = get_account_balance(**fn_args)
                print(f"  Tool result: {result}")
        print("\n✓ TOOL CALLING WORKS — the agent is feasible.")
    else:
        print("✗ Model did NOT call the tool. It replied with text:")
        print(f"  {message.get('content', '')}")
        print("\nWe may need to adjust the model or prompt.")


if __name__ == "__main__":
    main()