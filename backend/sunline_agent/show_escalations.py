"""List the cases waiting for a human:  python -m sunline_agent.show_escalations"""
import sys

from sqlalchemy import select

from . import config
from .db import AgentEscalation, make_session_factory


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            pass
    with make_session_factory(config.LOG_DATABASE_URL)() as s:
        rows = s.scalars(select(AgentEscalation).order_by(AgentEscalation.id.desc()).limit(30)).all()
        if not rows:
            print("No escalations yet.")
        for r in rows:
            order = f" | order {r.order_number}" if r.order_number else ""
            print(f"ESC-{r.id:05d} [{r.status}] {r.created_at:%Y-%m-%d %H:%M} | {r.reason} | {r.language}{order} | run #{r.run_id}")
            print(f"    {r.summary}")


if __name__ == "__main__":
    main()
