"""Print what the agent did in one run: tools called, what the knowledge base returned, the answer.

    python -m sunline_agent.show_run 26      (a run number)
    python -m sunline_agent.show_run         (the latest run)
"""
import sys

from sqlalchemy import select

from . import config
from .db import AgentRun, AgentStep, make_session_factory


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            pass
    sf = make_session_factory(config.LOG_DATABASE_URL)
    with sf() as s:
        if len(sys.argv) > 1:
            run = s.get(AgentRun, int(sys.argv[1]))
        else:
            run = s.scalars(select(AgentRun).order_by(AgentRun.id.desc())).first()
        if run is None:
            print("Run not found.")
            return
        print(f"RUN #{run.id} [{run.outcome}] tokens in/out: {run.input_tokens}/{run.output_tokens}")
        print(f"QUESTION: {run.user_message}\n")
        for st in s.scalars(select(AgentStep).where(AgentStep.run_id == run.id).order_by(AgentStep.id)):
            if st.error:
                print(f"  [{st.type}] ERROR: {st.error}")
            elif st.type == "llm":
                calls = (st.output or {}).get("tool_calls") or []
                print(f"  [llm] asked for tools: {calls}" if calls else "  [llm] wrote the answer")
            else:
                print(f"  [tool] {st.tool_name} {st.input}")
                out = st.output or {}
                if st.tool_name == "search_knowledge_base":
                    print(f"         found={out.get('found')} best_score={out.get('best_score')}")
                    for p in out.get("passages", []):
                        tag = f"score {p['score']}" if "score" in p else "context"
                        print(f"         - {p['topic']} ({tag})")
                        print(f"           {p['text'][:140].replace(chr(10), ' ')}")
                else:
                    print(f"         {str(out)[:300]}")
        print(f"\nANSWER: {run.final_answer}")


if __name__ == "__main__":
    main()
