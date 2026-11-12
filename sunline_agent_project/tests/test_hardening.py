import json
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from sunline_agent.db import AgentRun, AgentStep, make_engine, make_session_factory
from sunline_agent.grants import grant_sql
from sunline_agent.limits import RedisAttemptLimiter, RedisRateLimiter
from sunline_agent.order_tools import GetOrderStatusArgs, get_order_status
from sunline_agent.purge_logs import purge
from sunline_agent.seed_demo import ALICE_ID, seed
from sunline_agent.shop_tables import READ_TABLES, orders_read
from sunline_agent.agent import _execute_tool

PII_COLUMNS = {"full_name", "email", "address_line", "postal_code", "hashed_password"}


class FakeRedis:
    """Just enough of redis-py for the limiters and the conversation store."""

    def __init__(self):
        self.z, self.kv = {}, {}

    def zremrangebyscore(self, k, lo, hi):
        self.z[k] = {m: sc for m, sc in self.z.get(k, {}).items() if not (lo <= sc <= hi)}

    def zcard(self, k):
        return len(self.z.get(k, {}))

    def zadd(self, k, mapping):
        self.z.setdefault(k, {}).update(mapping)

    def expire(self, k, ttl):
        pass

    def get(self, k):
        return self.kv.get(k)

    def setex(self, k, ttl, v):
        self.kv[k] = v


# ------------------------------------------------------------- least privilege

def test_read_models_contain_no_personal_data_columns():
    cols = {c.name for t in READ_TABLES for c in t.columns}
    assert not cols & PII_COLUMNS, cols & PII_COLUMNS
    assert "phone" in {c.name for c in orders_read.columns}          # needed only to verify guests


def test_generated_grants_exclude_users_and_personal_columns():
    sql = grant_sql()
    assert "users" not in sql.replace("agent_ro", "")
    for col in PII_COLUMNS:
        assert col not in sql
    assert "GRANT SELECT (id, order_number" in sql and "INSERT" not in sql and "UPDATE" not in sql and "DELETE" not in sql


def test_order_queries_never_select_personal_columns():
    engine = make_engine("sqlite:///:memory:")
    seed(engine)
    statements = []
    from sqlalchemy import event
    event.listen(engine, "before_cursor_execute", lambda c, cur, st, p, ctx, many: statements.append(st))
    Session = sessionmaker(engine)
    with Session() as s:
        get_order_status(s, GetOrderStatusArgs(order_number="DEV-1001"), {"user_id": str(ALICE_ID)})
    sql = " ".join(statements).lower()
    assert "orders" in sql
    for col in PII_COLUMNS:
        assert col not in sql, f"query selected {col}"


# ------------------------------------------------------------------- Redis

def test_redis_attempt_limiter_blocks_expires_and_is_shared():
    now, r = [1000.0], FakeRedis()
    a = RedisAttemptLimiter(r, max_failures=3, window_seconds=60, clock=lambda: now[0])
    b = RedisAttemptLimiter(r, max_failures=3, window_seconds=60, clock=lambda: now[0])   # "another process"
    for _ in range(3):
        a.record_failure("order:X")
    assert a.blocked("order:X") and b.blocked("order:X") and not b.blocked("order:Y")
    now[0] += 61
    assert not b.blocked("order:X")


def test_redis_rate_limiter():
    now, r = [0.0], FakeRedis()
    rl = RedisRateLimiter(r, max_events=2, window_seconds=10, clock=lambda: now[0])
    assert [rl.allow("k") for _ in range(3)] == [True, True, False]
    now[0] = 11
    assert rl.allow("k")


class BrokenLimiter:
    def blocked(self, key):
        raise ConnectionError("redis is down")

    def record_failure(self, key):
        raise ConnectionError("redis is down")


def test_if_redis_is_down_no_order_data_is_returned():
    engine = make_engine("sqlite:///:memory:")
    seed(engine)
    with sessionmaker(engine)() as s:
        out, err = _execute_tool("get_order_status", {"order_number": "DEV-1001"}, s,
                                 {"user_id": str(ALICE_ID), "limiter": BrokenLimiter(), "session_id": "x"})
    assert out is None and "ConnectionError" in err                      # fail closed


# --------------------------------------------------------------- log retention

def test_purge_deletes_old_runs_and_their_steps_only():
    sf = make_session_factory("sqlite:///:memory:")
    now = datetime.now(timezone.utc)
    with sf() as s:
        old, new = AgentRun(user_message="old", started_at=now - timedelta(days=45)), AgentRun(user_message="new", started_at=now)
        s.add_all([old, new])
        s.commit()
        s.add_all([AgentStep(run_id=old.id, step_no=1, type="llm"), AgentStep(run_id=new.id, step_no=1, type="llm")])
        s.commit()
    assert purge(sf, days=30) == {"runs": 1, "steps": 1}
    with sf() as s:
        assert [r.user_message for r in s.scalars(select(AgentRun))] == ["new"]
        assert len(s.scalars(select(AgentStep)).all()) == 1
