"""Terminal chat:  python -m sunline_agent.cli"""
import os
import uuid

from . import config
from .agent import run_agent
from .db import make_data_session_factory, make_session_factory
from .embeddings import make_embedder
from .kb import KnowledgeBase, make_kb_session_factory
from .limits import AttemptLimiter
from .llm import make_llm
from .seed_demo import DEV_LOGINS


def main():
    llm = make_llm(config)
    data_sf = make_data_session_factory(config.DATABASE_URL)   # read-only use, creates nothing
    log_sf = make_session_factory(config.LOG_DATABASE_URL)     # creates agent_runs / agent_steps
    kb = KnowledgeBase(make_kb_session_factory(config.KB_DATABASE_URL), make_embedder(config),
                       config.KB_MIN_SCORE)
    if kb.count() == 0:
        print("[warning] knowledge base is empty. Run: python -m sunline_agent.kb_index\n")
    login = os.getenv("DEV_LOGIN", "").lower()
    user_id = DEV_LOGINS.get(login)          # None = guest. In production this comes from the real login.
    print(f"[dev] customer is: {login if user_id else 'guest (not logged in)'}\n")
    ctx = {"kb": kb, "user_id": user_id, "limiter": AttemptLimiter(), "session_id": str(uuid.uuid4())}
    history = []
    print(f"SUNLINE assistant [{config.PROVIDER}:{config.MODEL}] (Ctrl+C to quit)\n")
    while True:
        try:
            msg = input("Vous > ").strip()
        except (KeyboardInterrupt, EOFError):
            break
        if not msg:
            continue
        try:
            res = run_agent(msg, llm, data_sf, log_sf, history=history, ctx=ctx)
        except KeyboardInterrupt:
            print("\n[interrupted: this question was cancelled]\n")
            continue
        history = res.history
        print(f"\nSUNLINE > {res.answer}\n   [run #{res.run_id} · {res.outcome}]\n")


if __name__ == "__main__":
    main()
