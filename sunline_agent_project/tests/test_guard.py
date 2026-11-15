"""The grounding guard: an answer may not contain numbers that no tool result (or the customer) provided.
Regression for the real failure: the agent answered an Arabic returns question WITHOUT calling any
tool and invented '14 days' (the policy says 7)."""
from pathlib import Path

import pytest
from sqlalchemy import select

from sunline_agent.agent import _numbers, _values_text, run_agent
from sunline_agent.db import AgentStep, make_session_factory
from sunline_agent.embeddings import HashingEmbedder
from sunline_agent.kb import KnowledgeBase, make_kb_session_factory
from sunline_agent.llm import LLMResponse
from sunline_agent.seed_demo import seed

KNOWLEDGE = Path(__file__).resolve().parent.parent / "knowledge"


class ScriptLLM:
    def __init__(self, script):
        self.script, self.calls = list(script), 0

    def create(self, system, messages, tools):
        self.calls += 1
        return self.script[min(self.calls - 1, len(self.script) - 1)]


def call(name, inp):
    return LLMResponse("tool_use", [{"type": "tool_use", "id": "t", "name": name, "input": inp}], 10, 5)


def say(t):
    return LLMResponse("end_turn", [{"type": "text", "text": t}], 10, 5)


@pytest.fixture
def env():
    data = make_session_factory("sqlite:///:memory:")
    seed(data.kw["bind"])
    log = make_session_factory("sqlite:///:memory:")
    kb = KnowledgeBase(make_kb_session_factory("sqlite:///:memory:"), HashingEmbedder(), 0.2)
    kb.index_directory(KNOWLEDGE)
    return data, log, {"kb": kb}


def step_types(log, run_id):
    with log() as s:
        return [x.type for x in s.scalars(select(AgentStep).where(AgentStep.run_id == run_id).order_by(AgentStep.id))]


def test_number_extraction_handles_arabic_digits_and_formats():
    assert _numbers("خلال ١٤ يوماً") == {"14"}
    assert _numbers("89.0 TND, 5 à 10 jours, 1,5") == {"89", "5", "10", "1.5"}
    assert _numbers("pas de chiffre") == set()
    assert "1" not in _numbers(_values_text({"id": 1, "found": True, "passages": [{"text": "7 jours", "score": 0.5}]}))


def test_invented_number_without_tool_is_blocked_then_corrected(env):
    data, log, ctx = env
    llm = ScriptLLM([say("Oui, vous avez 14 jours pour retourner."),                       # invented, no tool
                     call("search_knowledge_base", {"query": "délai pour retourner un jean"}),
                     say("Vous pouvez retourner un jean dans les 7 jours suivant la réception.")])
    res = run_agent("Puis-je retourner un jean ?", llm, data, log, ctx=ctx)
    assert res.outcome == "answered" and "7 jours" in res.answer and "14" not in res.answer
    assert "guard" in step_types(log, res.run_id)


def test_still_ungrounded_after_retries_falls_back(env):
    data, log, ctx = env
    res = run_agent("Puis-je retourner ?", ScriptLLM([say("14 jours.")]), data, log, ctx=ctx)
    assert res.outcome == "ungrounded" and "conseiller" in res.answer and res.history == []


def test_numbers_from_the_customer_message_are_allowed(env):
    data, log, ctx = env
    res = run_agent("Je fais du 40, vous l'avez ?", ScriptLLM([say("Pour la taille 40, je vérifie.")]), data, log, ctx=ctx)
    assert res.outcome == "answered" and "guard" not in step_types(log, res.run_id)


def test_numbers_from_tool_results_are_allowed(env):
    data, log, ctx = env
    llm = ScriptLLM([call("search_products", {"query": "jean noir"}), say("Le Jean Mom Fit Noir coûte 89 TND.")])
    res = run_agent("jean noir ?", llm, data, log, ctx=ctx)
    assert res.outcome == "answered"


def test_counts_in_tool_results_are_facts_the_agent_may_state():
    """Regression: 'count' used to be ignored, so 'Vous avez 3 commandes' could be blocked as ungrounded."""
    assert "5" in _numbers(_values_text({"count": 5, "orders": []}))
    assert "7" not in _numbers(_values_text({"id": 7, "score": 7, "best_score": 7}))
