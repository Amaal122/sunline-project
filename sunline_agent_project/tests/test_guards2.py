"""Guards found in real runs: (1) the model answered about an order WITHOUT calling the tool
(so the lockout never triggered), (2) answers were cut off mid-sentence by the output budget."""
import pytest
from sqlalchemy import select

from sunline_agent import config
from sunline_agent.agent import ORDER_TOKEN, run_agent
from sunline_agent.db import AgentEscalation, AgentStep, make_session_factory
from sunline_agent.escalation import EscalateArgs, escalate_to_human
from sunline_agent.llm import LLMResponse, stop_reason_from_openai
from sunline_agent.seed_demo import ALICE_ID, seed


class Script:
    def __init__(self, script):
        self.script, self.n, self.kwargs = list(script), 0, []

    def create(self, system, messages, tools, **kw):
        self.kwargs.append(kw)
        self.n += 1
        return self.script[min(self.n - 1, len(self.script) - 1)]


def call(name, inp):
    return LLMResponse("tool_use", [{"type": "tool_use", "id": "t", "name": name, "input": inp}], 10, 5)


def say(t, stop="end_turn"):
    return LLMResponse(stop, [{"type": "text", "text": t}], 10, 5)


@pytest.fixture
def env():
    data = make_session_factory("sqlite:///:memory:")
    seed(data.kw["bind"])
    return data, make_session_factory("sqlite:///:memory:")


def kinds(log, run_id):
    with log() as s:
        return [(x.type, (x.output or {}) if x.type == "guard" else None)
                for x in s.scalars(select(AgentStep).where(AgentStep.run_id == run_id).order_by(AgentStep.id))]


@pytest.mark.parametrize("text, expected", [("DEV-1001 + 20 000 112", True), ("ma commande #12345", True),
                                            ("où est SL_2026 ?", True), ("commande du 29-10-2026", False), ("taille 40, TND 106", False),
                                            ("Où est ma commande ?", False), ("20 000 333", False),
                                            ("SL392672", True), ("ma commande sl392672 svp", True), ("SL39267", True),
                                            ("TND106", False), ("taille40", False), ("iphone 15", False)])
def test_order_token_detection(text, expected):
    assert bool(ORDER_TOKEN.search(text)) is expected


def test_answer_about_an_order_without_a_tool_call_is_sent_back(env):
    data, log = env
    llm = Script([say("Je ne trouve toujours pas cette commande."),                 # skipped the tool
                  call("get_order_status", {"order_number": "DEV-1001", "phone": "20 000 112"}),
                  say("Je ne trouve pas de commande correspondante.")])
    res = run_agent("DEV-1001 + 20 000 112", llm, data, log, ctx={"user_id": None})
    assert res.outcome == "answered"
    assert any(t == "guard" and o.get("missing_tool") for t, o in kinds(log, res.run_id))
    assert any(t == "tool" for t, _ in kinds(log, res.run_id))


def test_model_that_never_calls_the_tool_gets_the_fallback(env):
    data, log = env
    res = run_agent("DEV-1001", Script([say("Elle est expédiée.")]), data, log)
    assert res.outcome == "no_lookup" and "conseiller" in res.answer and res.history == []


def test_escalation_counts_as_an_order_tool(env):
    data, log = env
    llm = Script([call("escalate_to_human", {"reason": "cancellation", "summary": "annuler DEV-1001"}),
                  say("C'est noté sous la référence ESC-00001.")])
    res = run_agent("Annule DEV-1001", llm, data, log, ctx={"log_sf": log})
    assert res.outcome == "answered"


def test_no_order_number_no_forced_tool(env):
    data, log = env
    res = run_agent("Où est ma commande ?", Script([say("Pouvez-vous vous connecter ?")]), data, log)
    assert res.outcome == "answered"


def test_truncated_answer_is_retried_with_a_bigger_budget(env):
    data, log = env
    llm = Script([say("Votre commande est en cours de", stop="max_tokens"),
                  say("Votre commande est en cours de préparation.")])
    res = run_agent("bonjour", llm, data, log)
    assert res.outcome == "answered" and res.answer.endswith("préparation.")
    assert llm.kwargs == [{}, {"max_tokens": config.MAX_OUTPUT_TOKENS * 3}]
    assert any(t == "guard" and o.get("truncated") for t, o in kinds(log, res.run_id))


def test_persistently_truncated_answer_is_never_shown(env):
    data, log = env
    res = run_agent("bonjour", Script([say("Je ne trouve pas de comm", stop="max_tokens")]), data, log)
    assert res.outcome == "truncated" and "comm" not in res.answer and res.history == []


def test_finish_reason_length_is_mapped_to_max_tokens():
    assert stop_reason_from_openai("length", False) == "max_tokens"
    assert stop_reason_from_openai("length", True) == "max_tokens"
    assert stop_reason_from_openai("stop", False) == "end_turn"
    assert stop_reason_from_openai("tool_calls", True) == "tool_use"


def test_escalation_marks_guests_as_unverified(env):
    data, log = env
    escalate_to_human(None, EscalateArgs(reason="cancellation", summary="annuler"), {"log_sf": log})
    escalate_to_human(None, EscalateArgs(reason="cancellation", summary="annuler"), {"log_sf": log, "user_id": str(ALICE_ID)})
    with log() as s:
        rows = s.scalars(select(AgentEscalation).order_by(AgentEscalation.id)).all()
    assert rows[0].summary.startswith("[GUEST, identity NOT verified]")
    assert rows[1].summary.startswith("[logged-in customer]")


def test_real_order_number_format_is_accepted_by_the_tool_input_cleaner():
    from sunline_agent.order_tools import _clean_order_number
    assert _clean_order_number("sl392672") == "SL392672" and _clean_order_number("#SL392672 ") == "SL392672"
    assert _clean_order_number("SL39'; DROP") is None
