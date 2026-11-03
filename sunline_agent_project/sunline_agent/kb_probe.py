"""See what the knowledge base returns for a question, with scores.
Use it to choose KB_MIN_SCORE:  python -m sunline_agent.kb_probe "Quel est le délai de livraison ?" """
import sys

from . import config
from .embeddings import make_embedder
from .kb import KnowledgeBase, make_kb_session_factory


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            pass
    kb = KnowledgeBase(make_kb_session_factory(config.KB_DATABASE_URL), make_embedder(config), config.KB_MIN_SCORE)
    for q in sys.argv[1:] or ["Quel est le délai de livraison ?"]:
        print(f"\n{q}")
        for h in kb.search(q, 3):
            flag = "keep" if h["score"] >= kb.min_score else "below threshold"
            print(f"  {h['score']:.2f}  {h['title']}  ({flag})")


if __name__ == "__main__":
    main()
