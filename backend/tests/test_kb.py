import json
from pathlib import Path

import pytest

from sunline_agent.embeddings import HashingEmbedder
from sunline_agent.kb import KBNotReady, KnowledgeBase, chunk_markdown, make_kb_session_factory
from sunline_agent.tools import SearchKBArgs, search_knowledge_base

KNOWLEDGE = Path(__file__).resolve().parent.parent / "knowledge"


class CountingEmbedder(HashingEmbedder):
    def __init__(self):
        super().__init__()
        self.embedded = 0

    def embed(self, texts, kind="passage"):
        self.embedded += len(texts)
        return super().embed(texts, kind)


def make_kb(embedder=None, min_score=0.2):
    return KnowledgeBase(make_kb_session_factory("sqlite:///:memory:"), embedder or HashingEmbedder(), min_score)


def test_chunking_by_headings_and_comments_removed():
    md = "<!-- note -->\n# Livraison\n\n## Délais\nDe 2 à 4 jours.\n\n## Frais\n7 TND.\n"
    ch = chunk_markdown(md, "livraison.md")
    assert [c["title"] for c in ch] == ["Livraison > Délais", "Livraison > Frais"]
    assert all("note" not in c["text"] for c in ch)


def test_long_section_is_split_by_paragraph():
    md = "# T\n" + "\n\n".join(["mot " * 100] * 5)
    assert len(chunk_markdown(md, "t.md", max_chars=900)) > 1


def test_indexing_is_incremental():
    emb = CountingEmbedder()
    kb = make_kb(emb)
    first = kb.index_directory(KNOWLEDGE)
    assert first["embedded_now"] == first["chunks"] > 10
    before = emb.embedded
    second = kb.index_directory(KNOWLEDGE)
    assert second["embedded_now"] == 0 and emb.embedded == before and second["kept"] == first["chunks"]


@pytest.mark.parametrize("question, expected_source", [
    ("Quel est le délai de livraison ?", "livraison.md"),
    ("Combien coûtent les frais de livraison ?", "livraison.md"),
    ("Puis-je retourner un jean que je n'ai pas aimé ?", "retours.md"),
    ("Comment échanger ma taille ?", "retours.md"),
    ("Peut-on payer à la livraison ?", "paiement.md"),
    ("Quelle taille choisir avec un tour de taille de 70 cm ?", "guide_des_tailles.md"),
    ("Comment laver mon jean ?", "entretien.md"),
])
def test_retrieval_finds_the_right_document(question, expected_source):
    kb = make_kb()
    kb.index_directory(KNOWLEDGE)
    hits = kb.search(question, 3)          # the agent receives the top few passages
    assert expected_source in [h["source"] for h in hits], [(h["source"], round(h["score"], 2)) for h in hits]
    assert hits[0]["score"] >= kb.min_score


def test_unrelated_question_is_below_threshold():
    kb = make_kb()
    kb.index_directory(KNOWLEDGE)
    for q in ["Quel est le meilleur film de 2024 ?", "Donne-moi la recette du couscous",
              "Qui est le président de la France ?"]:
        assert kb.search(q, 1)[0]["score"] < kb.min_score, q


def test_empty_kb_and_embedder_change_require_reindex():
    kb = make_kb()
    with pytest.raises(KBNotReady):
        kb.search("livraison")
    kb.index_directory(KNOWLEDGE)
    other = KnowledgeBase(kb.sf, HashingEmbedder(dim=256), 0.2)   # different embedder name
    with pytest.raises(KBNotReady):
        other.search("livraison")
    other.index_directory(KNOWLEDGE)                              # re-index replaces old vectors
    assert kb.count() == 0 and other.count() > 10


def test_tool_returns_found_false_for_unrelated_question():
    kb = make_kb()
    kb.index_directory(KNOWLEDGE)
    out = search_knowledge_base(None, SearchKBArgs(query="Quel est le meilleur film de 2024 ?"), {"kb": kb})
    assert out["found"] is False and out["passages"] == []
    out = search_knowledge_base(None, SearchKBArgs(query="délai de livraison"), {"kb": kb})
    assert out["found"] is True and "jours" in json.dumps(out, ensure_ascii=False)


def test_eval_file_is_valid_and_french_retrieval_works_with_baseline_embedder():
    from sunline_agent.kb_eval import evaluate
    cases = json.load(open(KNOWLEDGE.parent / "eval" / "kb_questions.json", encoding="utf-8"))
    assert len(cases) >= 20 and all("question" in c and "expected" in c for c in cases)
    kb = make_kb()
    kb.index_directory(KNOWLEDGE)
    fr = [c for c in cases if c["lang"] == "fr"]
    res = evaluate(kb, fr)
    assert res["top3"] >= 0.8 * res["covered"]          # baseline hashing embedder, French only


def test_tool_adds_sibling_sections_so_numbers_are_not_missing():
    """Regression: the agent once said '14 days' because only the CONDITIONS section of the
    returns policy was retrieved and the DEADLINE section ('7 jours') was missing."""
    kb = make_kb()
    kb.index_directory(KNOWLEDGE)
    out = search_knowledge_base(None, SearchKBArgs(query="conditions pour retourner un jean non porté étiquette", top_k=1), {"kb": kb})
    text = json.dumps(out, ensure_ascii=False)
    assert out["found"] and "7 jours" in text
    assert any("score" not in p for p in out["passages"])        # at least one sibling (context) passage
    assert all(p["topic"].startswith("Retours") for p in out["passages"])   # siblings from the same document only
