"""Knowledge base: Markdown files -> chunks -> embeddings -> SQLite -> similarity search.

Storage is a plain table; search is brute-force cosine similarity (vectors are
normalised, so cosine == dot product). That is exact and fast for up to a few thousand
chunks. To move to pgvector later: same columns, `embedding vector(N)`, and
`ORDER BY embedding <=> :query_vec LIMIT k` instead of the Python loop in search().
"""
import hashlib
import re
from pathlib import Path

from sqlalchemy import JSON, Column, Integer, String, Text, delete, select
from sqlalchemy.orm import declarative_base, sessionmaker

from .db import make_engine
from .embeddings import dot

KBBase = declarative_base()


class KBChunk(KBBase):
    __tablename__ = "kb_chunks"
    id = Column(Integer, primary_key=True)
    source = Column(String(200), index=True)      # file name, e.g. livraison.md
    title = Column(String(300))                   # heading path, e.g. "Livraison > Délais"
    text = Column(Text)
    content_hash = Column(String(64), index=True)
    embedder = Column(String(100), index=True)    # which model produced the vector
    embedding = Column(JSON)                      # list of floats


class KBNotReady(RuntimeError):
    pass


def make_kb_session_factory(url: str):
    engine = make_engine(url)
    KBBase.metadata.create_all(engine)
    return sessionmaker(engine, expire_on_commit=False)


# ----------------------------------------------------------------- chunking

_HEADING = re.compile(r"^(#{1,3})\s+(.*\S)\s*$")


def _split_long(body: str, max_chars: int):
    if len(body) <= max_chars:
        return [body]
    parts, cur = [], ""
    for para in re.split(r"\n\s*\n", body):
        if cur and len(cur) + len(para) + 2 > max_chars:
            parts.append(cur)
            cur = para
        else:
            cur = f"{cur}\n\n{para}" if cur else para
    if cur:
        parts.append(cur)
    return parts


def chunk_markdown(text: str, source: str, max_chars: int = 900):
    """Split by headings (up to level 3); long sections are split by paragraph.
    HTML comments (<!-- ... -->) are dropped, so you can leave notes in the files."""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    stack, body, chunks = [], [], []

    def flush():
        content = "\n".join(body).strip()
        if content:
            title = " > ".join(t for _, t in stack) or Path(source).stem
            for part in _split_long(content, max_chars):
                chunks.append({"source": source, "title": title, "text": part})
        body.clear()

    for line in text.splitlines():
        m = _HEADING.match(line)
        if m:
            flush()
            level = len(m.group(1))
            while stack and stack[-1][0] >= level:
                stack.pop()
            stack.append((level, m.group(2)))
        else:
            body.append(line)
    flush()
    for c in chunks:
        c["hash"] = hashlib.sha256(f"{c['source']}\n{c['title']}\n{c['text']}".encode()).hexdigest()
    return chunks


# ------------------------------------------------------------ knowledge base

class KnowledgeBase:
    def __init__(self, session_factory, embedder, min_score: float = 0.2):
        self.sf, self.embedder, self.min_score = session_factory, embedder, min_score

    def count(self) -> int:
        with self.sf() as s:
            return len(s.scalars(select(KBChunk.id).where(KBChunk.embedder == self.embedder.name)).all())

    def index_directory(self, directory) -> dict:
        """(Re)build the index from *.md files. Unchanged chunks are not re-embedded."""
        chunks = []
        for path in sorted(Path(directory).glob("*.md")):
            chunks += chunk_markdown(path.read_text(encoding="utf-8"), path.name)
        current = {c["hash"] for c in chunks}
        with self.sf() as s:
            existing = {r.content_hash for r in s.scalars(
                select(KBChunk).where(KBChunk.embedder == self.embedder.name))}
            # remove vectors of deleted/changed chunks and of any other embedder
            stale = s.execute(delete(KBChunk).where(
                (KBChunk.embedder != self.embedder.name) | (KBChunk.content_hash.not_in(current))))
            new, seen = [], set()
            for c in chunks:
                if c["hash"] not in existing and c["hash"] not in seen:
                    seen.add(c["hash"])
                    new.append(c)
            if new:
                vectors = self.embedder.embed([f"{c['title']}\n{c['text']}" for c in new], "passage")
                for c, v in zip(new, vectors):
                    s.add(KBChunk(source=c["source"], title=c["title"], text=c["text"],
                                  content_hash=c["hash"], embedder=self.embedder.name, embedding=v))
            s.commit()
        return {"chunks": len(current), "embedded_now": len(new),
                "kept": len(current & existing), "removed": stale.rowcount or 0}

    def search(self, query: str, top_k: int = 4):
        with self.sf() as s:
            rows = s.scalars(select(KBChunk).where(KBChunk.embedder == self.embedder.name)).all()
            if not rows:
                raise KBNotReady("Knowledge base is empty or was built with another embedder. "
                                 "Run: python -m sunline_agent.kb_index")
            qv = self.embedder.embed([query], "query")[0]
            scored = sorted(((dot(qv, r.embedding), r) for r in rows), key=lambda x: -x[0])[:top_k]
            return [{"id": r.id, "source": r.source, "title": r.title, "text": r.text, "score": float(sc)}
                    for sc, r in scored]

    def expand_with_siblings(self, hits, max_chars: int = 2500):
        """Add the other chunks of the best hit's document (in file order) after the hits.

        Why: a question is often answered by several sections of the same policy (e.g. the
        return DEADLINE and the return CONDITIONS). If only one section is retrieved, the model
        may fill the missing number from its own general knowledge. Policy documents are short,
        so giving the whole document for the best match is cheap and safer."""
        if not hits:
            return hits
        have = {h["id"] for h in hits}
        with self.sf() as s:
            rows = s.scalars(select(KBChunk).where(
                KBChunk.embedder == self.embedder.name,
                KBChunk.source == hits[0]["source"]).order_by(KBChunk.id)).all()
        out, total = list(hits), sum(len(h["text"]) for h in hits)
        for r in rows:
            if r.id in have or total + len(r.text) > max_chars:
                continue
            out.append({"id": r.id, "source": r.source, "title": r.title, "text": r.text,
                        "score": None, "context": True})
            total += len(r.text)
        return out
