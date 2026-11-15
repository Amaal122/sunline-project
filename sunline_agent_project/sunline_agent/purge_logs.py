"""Delete old conversation logs (they contain customer messages):

    python -m sunline_agent.purge_logs --days 30

Support cases (agent_escalations) are business records and are NOT deleted here."""
import argparse
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select

from . import config
from .db import AgentRun, AgentStep, make_session_factory


def purge(session_factory, days: int, now=None) -> dict:
    cutoff = (now or datetime.now(timezone.utc)) - timedelta(days=days)
    with session_factory() as s:
        old = select(AgentRun.id).where(AgentRun.started_at < cutoff)
        steps = s.execute(delete(AgentStep).where(AgentStep.run_id.in_(old))).rowcount
        runs = s.execute(delete(AgentRun).where(AgentRun.started_at < cutoff)).rowcount
        s.commit()
    return {"runs": runs, "steps": steps}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30)
    args = ap.parse_args()
    print(purge(make_session_factory(config.LOG_DATABASE_URL), args.days))


if __name__ == "__main__":
    main()
