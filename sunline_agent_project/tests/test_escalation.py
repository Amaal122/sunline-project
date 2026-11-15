import pytest
from sqlalchemy import select

from sunline_agent import config
from sunline_agent.agent import run_agent
from sunline_agent.db import AgentEscalation, make_session_factory
from sunline_agent.escalation import EscalateArgs, escalate_to_human, redact
from sunline_agent.limits import AttemptLimiter
from sunline_agent.llm import LLMResponse
from sunline_agent.seed_demo import seed


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setattr(config, "ESCALATION_CONTACT", "WhatsApp +216 20 555 000")
    monkeypatch.setattr(config, "ESCALATION_HOURS", "lundi-samedi 9h-18h")
    data = make_session_factory("sqlite:///:memory:")
    seed(data.kw["bind"])
    return data, make_session_factory("sqlite:///:memory:")


def test_redaction_masks_phones_and_emails_but_not_order_numbers():
    out = redact("Appeler au +216 20 000 111 ou 20000111, mail alice@example.test, commande DEV-1001")
    assert "20 000" not in out and "20000111" not in out and "example.test" not in out and "DEV-1001" in out


def test_escalation_is_recorded_masked_and_returns_contact(env):
    data, log = env
    ctx = {"log_sf": log, "run_id": 7, "limiter": AttemptLimiter(), "session_id": "s"}
    out = escalate_to_human(None, EscalateArgs(reason="cancellation", language="fr", order_number="#dev-1001",
                                               summary="Veut annuler, rappeler le 20 000 111"), ctx)
    assert out["recorded"] and out["reference"] == "ESC-00001" and "WhatsApp" in out["contact"]
    with log() as s:
        row = s.scalars(select(AgentEscalation)).one()
    assert row.order_number == "DEV-1001" and row.run_id == 7 and "20 000" not in row.summary


def test_invalid_order_number_is_not_stored(env):
    data, log = env
    escalate_to_human(None, EscalateArgs(reason="other", summary="x", order_number="'; DROP--"), {"log_sf": log})
    with log() as s:
        assert s.scalars(select(AgentEscalation)).one().order_number is None


def test_escalation_spam_is_limited(env):
    data, log = env
    ctx = {"log_sf": log, "limiter": AttemptLimiter(max_failures=3), "session_id": "s"}
    results = [escalate_to_human(None, EscalateArgs(reason="other", summary="x"), ctx) for _ in range(5)]
    assert [r["recorded"] for r in results] == [True, True, True, False, False]


def _call(inp):
    return LLMResponse("tool_use", [{"type": "tool_use", "id": "t", "name": "escalate_to_human", "input": inp}], 5, 5)


def _say(t):
    return LLMResponse("end_turn", [{"type": "text", "text": t}], 5, 5)


class Script:
    def __init__(self, s): self.s, self.n = list(s), 0
    def create(self, system, messages, tools):
        self.n += 1
        self.last_system = system
        return self.s[min(self.n - 1, len(self.s) - 1)]


def test_through_the_agent_loop_reference_and_contact_pass_the_number_guard(env):
    data, log = env
    llm = Script([_call({"reason": "cancellation", "summary": "Veut annuler DEV-1001."}),
                  _say("C'est noté sous la référence ESC-00001. Écrivez-nous sur WhatsApp +216 20 555 000 (lundi-samedi 9h-18h).")])
    res = run_agent("Annule ma commande", llm, data, log, ctx={"limiter": AttemptLimiter(), "session_id": "s"})
    assert res.outcome == "answered" and "ESC-00001" in res.answer
    assert "+216 20 555 000" in llm.last_system                 # contact is in the prompt


def test_contact_from_the_prompt_is_a_known_number(env):
    data, log = env
    res = run_agent("Comment vous joindre ?", Script([_say("Écrivez-nous sur WhatsApp +216 20 555 000.")]), data, log)
    assert res.outcome == "answered"


def test_without_contact_details_the_agent_is_told_not_to_mention_any(monkeypatch):
    from sunline_agent.agent import _system_prompt
    monkeypatch.setattr(config, "ESCALATION_CONTACT", "")
    monkeypatch.setattr(config, "ESCALATION_HOURS", "lundi-samedi 9h-18h")      # hours alone must not leak out
    log = make_session_factory("sqlite:///:memory:")
    out = escalate_to_human(None, EscalateArgs(reason="complaint", summary="x"), {"log_sf": log})
    assert out["recorded"] and out["contact"] is None and out["hours"] is None
    assert "do not mention WhatsApp" in out["instruction"]
    assert "never mention WhatsApp" in _system_prompt()
