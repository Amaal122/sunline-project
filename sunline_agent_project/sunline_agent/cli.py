"""Terminal chat:  python -m sunline_agent.cli"""
from . import config
from .agent import run_agent
from .db import make_data_session_factory, make_session_factory
from .embeddings import make_embedder
from .kb import KnowledgeBase, make_kb_session_factory
from .llm import make_llm


def main():
    llm = make_llm(config)
    data_sf = make_data_session_factory(config.DATABASE_URL)   # read-only use, creates nothing
    log_sf = make_session_factory(config.LOG_DATABASE_URL)     # creates agent_runs / agent_steps
    kb = KnowledgeBase(make_kb_session_factory(config.KB_DATABASE_URL), make_embedder(config),
                       config.KB_MIN_SCORE)
    if kb.count() == 0:
        print("[warning] knowledge base is empty. Run: python -m sunline_agent.kb_index\n")
    ctx = {"kb": kb}
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