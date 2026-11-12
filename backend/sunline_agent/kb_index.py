"""Build / refresh the knowledge base:  python -m sunline_agent.kb_index"""
from . import config
from .embeddings import make_embedder
from .kb import KnowledgeBase, make_kb_session_factory


def main():
    embedder = make_embedder(config)
    kb = KnowledgeBase(make_kb_session_factory(config.KB_DATABASE_URL), embedder, config.KB_MIN_SCORE)
    stats = kb.index_directory(config.KB_DIR)
    print(f"Embedder: {embedder.name}")
    print(f"Chunks: {stats['chunks']} | embedded now: {stats['embedded_now']} | "
          f"unchanged: {stats['kept']} | removed: {stats['removed']}")


if __name__ == "__main__":
    main()
