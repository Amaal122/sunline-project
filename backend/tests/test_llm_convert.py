"""Tests the message-format converters (no server needed)."""
import json
from types import SimpleNamespace as NS

from sunline_agent.llm import from_openai_message, to_openai_messages, to_openai_tools


def test_tools_conversion():
    t = to_openai_tools([{"name": "a", "description": "d", "input_schema": {"type": "object"}}])
    assert t[0]["function"]["parameters"] == {"type": "object"} and t[0]["type"] == "function"


def test_full_tool_round_trip_messages():
    msgs = [
        {"role": "user", "content": "jean noir ?"},
        {"role": "assistant", "content": [
            {"type": "text", "text": "Je cherche."},
            {"type": "tool_use", "id": "c1", "name": "search_products", "input": {"query": "jean"}}]},
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "c1", "content": "{\"count\": 1}"}]},
    ]
    out = to_openai_messages("SYS", msgs)
    assert [m["role"] for m in out] == ["system", "user", "assistant", "tool"]
    assert out[2]["tool_calls"][0]["function"]["name"] == "search_products"
    assert json.loads(out[2]["tool_calls"][0]["function"]["arguments"]) == {"query": "jean"}
    assert out[3]["tool_call_id"] == "c1"


def test_response_with_tool_call_and_broken_json():
    good = NS(content=None, tool_calls=[NS(id="x", function=NS(name="get_product", arguments='{"product_id": 1}'))])
    bad = NS(content="hi", tool_calls=[NS(id=None, function=NS(name="get_product", arguments="{oops"))])
    assert from_openai_message(good)[0]["input"] == {"product_id": 1}
    b = from_openai_message(bad)
    assert b[0]["type"] == "text" and b[1]["input"] == {} and b[1]["id"] == "call_0"


def test_make_llm_requires_key_for_hosted_and_rejects_unknown_provider():
    import pytest
    from types import SimpleNamespace as C
    from sunline_agent.llm import make_llm
    with pytest.raises(ValueError, match="LLM_API_KEY"):
        make_llm(C(PROVIDER="openai_compat", LLM_BASE_URL="https://api.groq.com/openai/v1",
                   LLM_API_KEY="", MODEL="m", MAX_OUTPUT_TOKENS=100))
    with pytest.raises(ValueError, match="Unknown PROVIDER"):
        make_llm(C(PROVIDER="nope"))
