"""LLM wrappers. The agent only needs an object with .create(system, messages, tools).

Two providers:
  - AnthropicLLM      : Claude API (paid, needs ANTHROPIC_API_KEY)
  - OpenAICompatLLM   : any OpenAI-compatible API: hosted open-source models
                        (Groq, OpenRouter, Together...) or a local Ollama server.

Internally the agent keeps messages in "Anthropic block format"; the converters below
translate to/from the OpenAI chat format.
"""
import json
from dataclasses import dataclass, field


@dataclass
class LLMResponse:
    stop_reason: str                      # "tool_use" or "end_turn" ...
    content: list = field(default_factory=list)   # list of plain dict blocks
    input_tokens: int = 0
    output_tokens: int = 0


# ----------------------------------------------------------------- Anthropic

class AnthropicLLM:
    def __init__(self, model: str, max_tokens: int = 1024):
        import anthropic  # imported lazily so tests don't need it
        self.client = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY
        self.model = model
        self.max_tokens = max_tokens

    def create(self, system: str, messages: list, tools: list) -> LLMResponse:
        r = self.client.messages.create(
            model=self.model, max_tokens=self.max_tokens,
            system=system, messages=messages, tools=tools,
        )
        content = []
        for b in r.content:
            if b.type == "text":
                content.append({"type": "text", "text": b.text})
            elif b.type == "tool_use":
                content.append({"type": "tool_use", "id": b.id,
                                "name": b.name, "input": b.input})
        return LLMResponse(r.stop_reason, content,
                           r.usage.input_tokens, r.usage.output_tokens)


# ------------------------------------------------- OpenAI-compatible (Ollama)

def to_openai_tools(tools: list) -> list:
    return [{"type": "function",
             "function": {"name": t["name"], "description": t["description"],
                          "parameters": t["input_schema"]}} for t in tools]


def to_openai_messages(system: str, messages: list) -> list:
    out = [{"role": "system", "content": system}]
    for m in messages:
        content = m["content"]
        if m["role"] == "user":
            if isinstance(content, str):
                out.append({"role": "user", "content": content})
                continue
            for b in content:
                if b["type"] == "tool_result":
                    out.append({"role": "tool", "tool_call_id": b["tool_use_id"],
                                "content": b["content"]})
                elif b["type"] == "text":
                    out.append({"role": "user", "content": b["text"]})
        else:  # assistant
            if isinstance(content, str):
                out.append({"role": "assistant", "content": content})
                continue
            text = "".join(b["text"] for b in content if b["type"] == "text")
            calls = [{"id": b["id"], "type": "function",
                      "function": {"name": b["name"], "arguments": json.dumps(b["input"])}}
                     for b in content if b["type"] == "tool_use"]
            msg = {"role": "assistant", "content": text or None}
            if calls:
                msg["tool_calls"] = calls
            out.append(msg)
    return out


def from_openai_message(message) -> list:
    """OpenAI assistant message -> list of Anthropic-style blocks."""
    blocks = []
    if message.content:
        blocks.append({"type": "text", "text": message.content})
    for i, tc in enumerate(message.tool_calls or []):
        try:
            args = json.loads(tc.function.arguments or "{}")
        except json.JSONDecodeError:
            args = {}            # small models sometimes emit broken JSON
        blocks.append({"type": "tool_use", "id": tc.id or f"call_{i}",
                       "name": tc.function.name, "input": args})
    return blocks


class OpenAICompatLLM:
    def __init__(self, model: str, base_url: str = "http://localhost:11434/v1",
                 api_key: str = "ollama", max_tokens: int = 1024):
        from openai import OpenAI  # lazy import
        self.client = OpenAI(base_url=base_url, api_key=api_key)
        self.model, self.max_tokens = model, max_tokens

    def create(self, system: str, messages: list, tools: list) -> LLMResponse:
        r = self.client.chat.completions.create(
            model=self.model, max_tokens=self.max_tokens,
            messages=to_openai_messages(system, messages),
            tools=to_openai_tools(tools), temperature=0.2,
        )
        msg = r.choices[0].message
        blocks = from_openai_message(msg)
        has_tools = any(b["type"] == "tool_use" for b in blocks)
        u = r.usage
        return LLMResponse("tool_use" if has_tools else "end_turn", blocks,
                           getattr(u, "prompt_tokens", 0) or 0,
                           getattr(u, "completion_tokens", 0) or 0)


# ------------------------------------------------------------------ factory

def make_llm(config):
    if config.PROVIDER == "anthropic":
        return AnthropicLLM(config.MODEL, config.MAX_OUTPUT_TOKENS)
    if config.PROVIDER in ("openai_compat", "ollama"):
        if not config.LLM_API_KEY and "localhost" not in config.LLM_BASE_URL:
            raise ValueError("LLM_API_KEY is empty. Put your provider key in .env")
        return OpenAICompatLLM(config.MODEL, config.LLM_BASE_URL,
                               api_key=config.LLM_API_KEY or "ollama",
                               max_tokens=config.MAX_OUTPUT_TOKENS)
    raise ValueError(f"Unknown PROVIDER '{config.PROVIDER}' (use 'openai_compat' or 'anthropic')")
