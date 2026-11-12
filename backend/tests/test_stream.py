import json

from fastapi import FastAPI
from fastapi.testclient import TestClient

from sunline_agent.api import build_agent_router
from sunline_agent.db import make_session_factory
from sunline_agent.llm import LLMResponse


class FakeLLM:
    """Optionally asks for a tool first, then answers."""

    def __init__(self, use_tool=False):
        self.use_tool, self.calls = use_tool, 0

    def create(self, system, messages, tools, max_tokens=None):
        self.calls += 1
        if self.use_tool and self.calls == 1:
            return LLMResponse("tool_use", [{"type": "tool_use", "id": "t1",
                                             "name": "get_product", "input": {}}], 1, 1)
        return LLMResponse("end_turn", [{"type": "text", "text": "Bonjour !"}], 1, 1)


def _client(llm):
    def get_db():
        yield object()          # the fake model never touches the shop database

    app = FastAPI()
    app.include_router(
        build_agent_router(get_db=get_db, get_optional_user=lambda: None, llm=llm, kb=None,
                           log_sf=make_session_factory("sqlite://")),
        prefix="/api/agent")
    return TestClient(app)


def _events(resp):
    return [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]


def test_stream_event_sequence():
    r = _client(FakeLLM()).post("/api/agent/chat/stream", json={"message": "Bonjour"})
    assert r.status_code == 200
    ev = _events(r)
    assert [e["type"] for e in ev] == ["meta", "answer", "done"]
    assert len(ev[0]["conversation_id"]) == 32
    assert ev[1]["text"] == "Bonjour !"


def test_stream_reports_tool_progress_without_leaking_tool_names():
    r = _client(FakeLLM(use_tool=True)).post("/api/agent/chat/stream", json={"message": "Bonjour"})
    ev = _events(r)
    assert [e["type"] for e in ev] == ["meta", "status", "answer", "done"]
    assert ev[1] == {"type": "status", "stage": "working"}      # generic stage, never the tool name
    assert "get_product" not in r.text


def test_stream_keeps_the_conversation():
    c = _client(FakeLLM())
    first = _events(c.post("/api/agent/chat/stream", json={"message": "Bonjour"}))[0]["conversation_id"]
    second = _events(c.post("/api/agent/chat/stream",
                            json={"message": "Merci", "conversation_id": first}))[0]["conversation_id"]
    assert first == second


def test_stream_rejects_empty_and_oversized_messages():
    c = _client(FakeLLM())
    assert c.post("/api/agent/chat/stream", json={"message": ""}).status_code == 422
    assert c.post("/api/agent/chat/stream", json={"message": "x" * 1001}).status_code == 422