"""Measure retrieval quality and help choose KB_MIN_SCORE.

    python -m sunline_agent.kb_eval [eval/kb_questions.json]

Each case: {"question", "lang", "expected": "file.md" or null}
  expected = file  -> the right document should be in the top 3 (and ideally first)
  expected = null  -> the knowledge base has no answer; the best score should stay BELOW the threshold
Edit the file with real questions in the way your customers actually write them.
"""
import json
import sys
from collections import defaultdict

from . import config
from .embeddings import make_embedder
from .kb import KnowledgeBase, make_kb_session_factory


def evaluate(kb, cases):
    rows = []
    for c in cases:
        hits = kb.search(c["question"], 3)
        top = hits[0]
        exp = c.get("expected")
        row = {"question": c["question"], "lang": c.get("lang", "?"), "expected": exp,
               "top_source": top["source"], "top_score": top["score"],
               "sources": [h["source"] for h in hits]}
        if exp:
            row["top1"] = top["source"] == exp
            row["top3"] = exp in row["sources"]
            row["ok"] = row["top3"] and top["score"] >= kb.min_score
        else:
            row["ok"] = top["score"] < kb.min_score
        rows.append(row)
    covered = [r for r in rows if r["expected"]]
    uncovered = [r for r in rows if not r["expected"]]
    by_lang = defaultdict(lambda: [0, 0])
    for r in covered:
        by_lang[r["lang"]][1] += 1
        by_lang[r["lang"]][0] += r["top3"]
    good_scores = [r["top_score"] for r in covered if r["top1"]]
    bad_scores = [r["top_score"] for r in uncovered]
    suggestion = None
    if good_scores and bad_scores and max(bad_scores) < min(good_scores):
        suggestion = round((max(bad_scores) + min(good_scores)) / 2, 2)
    return {"rows": rows,
            "top1": sum(r["top1"] for r in covered), "top3": sum(r["top3"] for r in covered),
            "covered": len(covered),
            "rejected": sum(r["ok"] for r in uncovered), "uncovered": len(uncovered),
            "by_lang": dict(by_lang),
            "max_uncovered_score": max(bad_scores) if bad_scores else None,
            "min_good_score": min(good_scores) if good_scores else None,
            "suggested_threshold": suggestion}


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "eval/kb_questions.json"
    cases = json.load(open(path, encoding="utf-8-sig"))
    embedder = make_embedder(config)
    kb = KnowledgeBase(make_kb_session_factory(config.KB_DATABASE_URL), embedder, config.KB_MIN_SCORE)
    res = evaluate(kb, cases)
    print(f"Embedder: {embedder.name} | threshold: {kb.min_score}\n")
    for r in res["rows"]:
        mark = "OK  " if r["ok"] else "FAIL"
        want = r["expected"] or "(no answer expected)"
        print(f"{mark} {r['top_score']:.2f} [{r['lang']:6}] {r['question'][:55]:55} -> {r['top_source']:22} want {want}")
    print(f"\nCovered questions : top-1 {res['top1']}/{res['covered']} | right doc in top-3 {res['top3']}/{res['covered']}")
    for lang, (ok, total) in sorted(res["by_lang"].items()):
        print(f"   {lang:7}: top-3 {ok}/{total}")
    print(f"Uncovered questions correctly rejected: {res['rejected']}/{res['uncovered']}")
    if res["suggested_threshold"] is not None:
        print(f"\nSuggested KB_MIN_SCORE = {res['suggested_threshold']} "
              f"(uncovered max {res['max_uncovered_score']:.2f} < covered min {res['min_good_score']:.2f})")
    else:
        print("\nNo clean threshold: scores of answerable and unanswerable questions overlap "
              f"(uncovered max {res['max_uncovered_score']}, covered min {res['min_good_score']}). "
              "A better embedder or more documents are needed.")


if __name__ == "__main__":
    main()
