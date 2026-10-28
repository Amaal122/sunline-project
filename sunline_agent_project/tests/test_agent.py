"""Tests with a scripted fake LLM: no API key, no cost, fully deterministic."""
import pytest
from sqlalchemy import select

from sunline_agent.agent import FALLBACK, run_agent
from sunline_agent.db import AgentRun, AgentStep, make_session_factory
from sunline_agent.llm import LLMResponse
from sunline_agent.seed_demo import seed


class FakeLLM:
    def __init__(self, script):
        self.script, self.calls = list(script), 0

    def create(self, system, messages, tools):
        self.calls += 1
        return self.script[min(self.calls - 1, len(self.script) - 1)]


def tool_call(name, inp, id_="t1"):
    return LLMResponse("tool_use", [{"type": "tool_use", "id": id_, "name": name, "input": inp}], 50, 20)


def say(text):
    return LLMResponse("end_turn", [{"type": "text", "text": text}], 60, 30)


@pytest.fixture
def sfs():
    data = make_session_factory("sqlite:///:memory:")
    seed(data.kw["bind"])
    return data, make_session_factory("sqlite:///:memory:")


def steps(log_sf, run_id):
    with log_sf() as s:
        return s.scalars(select(AgentStep).where(AgentStep.run_id == run_id)
                         .order_by(AgentStep.id)).all()


def test_search_then_answer_is_logged(sfs):
    data, log = sfs
    llm = FakeLLM([tool_call("search_products", {"query": "jean noir", "size": "40"}),
                   say("Le Jean Mom Fit Noir (89 TND) est disponible en 40.")])
    res = run_agent("Avez-vous un jean noir en 40 ?", llm, data, log)
    assert res.outcome == "answered" and "89" in res.answer
    st = steps(log, res.run_id)
    assert [s.type for s in st] == ["llm", "tool", "llm"]
    assert st[1].tool_name == "search_products" and st[1].output["count"] == 1


def test_size_filter_excludes_out_of_stock(sfs):
    data, log = sfs
    llm = FakeLLM([tool_call("search_products", {"query": "jean", "size": "36"}), say("ok")])
    res = run_agent("jean en 36", llm, data, log)
    tool_step = steps(log, res.run_id)[1]
    names = [p["name"] for p in tool_step.output["products"]]
    assert names == ["Jean Mom Fit Noir"]          # slim gris 36 has stock 0


def test_unknown_tool_and_bad_args_return_errors_not_crashes(sfs):
    data, log = sfs
    llm = FakeLLM([tool_call("delete_everything", {}),
                   tool_call("get_product", {"product_id": "abc"}),
                   say("Désolée.")])
    res = run_agent("test", llm, data, log)
    st = [s for s in steps(log, res.run_id) if s.type == "tool"]
    assert "Unknown tool" in st[0].error and "Invalid arguments" in st[1].error
    assert res.outcome == "answered"


def test_max_steps_stops_infinite_loop(sfs):
    data, log = sfs
    llm = FakeLLM([tool_call("search_products", {"query": "jean"})])   # loops forever
    res = run_agent("boucle", llm, data, log)
    assert res.outcome == "max_steps" and res.answer == FALLBACK and llm.calls == 6


def test_sql_injection_attempt_is_harmless(sfs):
    data, log = sfs
    llm = FakeLLM([tool_call("search_products", {"query": "'; DROP TABLE products; --"}), say("rien")])
    run_agent("x", llm, data, log)
    with data() as s:
        from sqlalchemy import text
        assert s.execute(text("SELECT COUNT(*) FROM products")).scalar() == 3


def test_run_totals_saved(sfs):
    data, log = sfs
    res = run_agent("salut", FakeLLM([say("Bonjour !")]), data, log)
    with log() as s:
        run = s.get(AgentRun, res.run_id)
        assert run.input_tokens == 60 and run.output_tokens == 30 and run.latency_ms is not None


class FlakyLogSession:
    """Behaves like a log session whose disk becomes full after the first commit."""
    def __init__(self, real):
        self.real, self.commits = real, 0

    def __enter__(self):
        self.real.__enter__()
        return self

    def __exit__(self, *a):
        return self.real.__exit__(*a)

    def add(self, o): self.real.add(o)
    def rollback(self): self.real.rollback()

    def commit(self):
        self.commits += 1
        if self.commits > 1:
            raise OSError("database or disk is full")
        self.real.commit()


def test_log_failure_does_not_break_the_answer(sfs, capsys):
    data, log = sfs
    flaky = lambda: FlakyLogSession(log())          # noqa: E731
    llm = FakeLLM([tool_call("search_products", {"query": "jean"}), say("Voici nos jeans.")])
    res = run_agent("jeans ?", llm, data, flaky)
    assert res.outcome == "answered" and res.answer == "Voici nos jeans."
    assert "could not write agent log" in capsys.readouterr().out


class RecordingLLM(FakeLLM):
    def __init__(self, script):
        super().__init__(script)
        self.seen = []

    def create(self, system, messages, tools):
        self.seen.append([dict(m) for m in messages])
        return super().create(system, messages, tools)


def test_history_is_compact_and_trimmed(sfs):
    data, log = sfs
    llm = RecordingLLM([tool_call("search_products", {"query": "jean noir"}), say("Oui, 89 TND."),
                        say("Avec plaisir."), say("de rien")])
    r1 = run_agent("jean noir ?", llm, data, log)
    # tool calls/results are NOT carried to the next turn, only the text
    assert r1.history == [{"role": "user", "content": "jean noir ?"},
                          {"role": "assistant", "content": "Oui, 89 TND."}]
    assert any(isinstance(m["content"], list) for m in r1.messages)   # but the trace keeps them
    r2 = run_agent("merci", llm, data, log, history=r1.history)
    assert all(isinstance(m["content"], str) for m in llm.seen[-1])
    # trimmed to the last MAX_HISTORY_TURNS question/answer pairs
    h = r2.history
    for i in range(10):
        h = run_agent(f"q{i}", llm, data, log, history=h).history
    from sunline_agent import config
    assert len(h) == 2 * config.MAX_HISTORY_TURNS and h[0]["role"] == "user"


def test_failed_run_does_not_pollute_history(sfs):
    data, log = sfs
    r = run_agent("x", FakeLLM([tool_call("search_products", {"query": "jean"})]), data, log,
                  history=[{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}])
    assert r.outcome == "max_steps" and len(r.history) == 2