"""Turn text into vectors (embeddings). All embedders share one interface:

    embedder.name                      -> str, stored with every vector
    embedder.embed(texts, kind)        -> list of L2-normalised vectors
                                          kind = "passage" (documents) or "query" (questions)

Vectors from DIFFERENT embedders cannot be compared, so the name is saved in the
knowledge base and a mismatch triggers "re-index needed".
"""
import math
import re
import unicodedata
import zlib


def normalize_vec(v):
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


# ----------------------------------------------------------------- hashing

_STOP = set("""le la les l un une des du de d et en au aux a à est sont je j puis peut peux
pouvez vous nous il elle ce cette ces que qui quel quelle quels quelles pour par sur dans avec
sans mon ma mes ton ta votre vos notre nos me te se s y ne pas plus ou où comment combien
quand si on ai as avez faut fait the an of to is are for and or how what do does""".split())


def _clean(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))  # drops accents, Arabic diacritics
    return re.sub(r"[^\w]+", " ", text).strip()


class HashingEmbedder:
    """No dependencies, works offline. Matches on shared words and letter-trigrams, so it
    tolerates typos and plurals but has NO real understanding of meaning and no
    cross-language matching ("livraison" will not match "توصيل").
    Good for tests and a first run; use fastembed or api for real semantic search."""

    def __init__(self, dim: int = 512):
        self.dim = dim
        self.name = f"hashing-{dim}"

    def _feature(self, vec, feat: str, weight: float):
        h = zlib.crc32(feat.encode("utf-8"))   # stable across runs (unlike Python's hash())
        vec[h % self.dim] += weight if (h >> 16) & 1 else -weight

    def embed(self, texts, kind="passage"):
        out = []
        for t in texts:
            vec = [0.0] * self.dim
            for w in _clean(t).split():
                if w in _STOP:
                    continue
                self._feature(vec, "w:" + w, 1.0)
                padded = f"<{w}>"
                for i in range(len(padded) - 2):
                    self._feature(vec, "t:" + padded[i:i + 3], 0.35)
            out.append(normalize_vec(vec))
        return out


# ---------------------------------------------------------------- fastembed

class FastEmbedEmbedder:
    """Real multilingual model running locally (ONNX, no PyTorch needed).
    pip install fastembed   |  check names with TextEmbedding.list_supported_models()"""

    def __init__(self, model: str):
        from fastembed import TextEmbedding   # lazy import
        self.model_name = model
        self.model = TextEmbedding(model_name=model)
        self.name = f"fastembed:{model}"
        self._e5 = "e5" in model.lower()      # e5 models expect "query: " / "passage: " prefixes

    def embed(self, texts, kind="passage"):
        if self._e5:
            texts = [f"{kind}: {t}" for t in texts]
        return [normalize_vec([float(x) for x in v]) for v in self.model.embed(texts)]


# ------------------------------------------------------------------ hosted

class OpenAICompatEmbedder:
    """Any provider exposing an OpenAI-style /embeddings endpoint."""

    def __init__(self, model: str, base_url: str, api_key: str):
        from openai import OpenAI              # lazy import
        self.client = OpenAI(base_url=base_url, api_key=api_key)
        self.model = model
        self.name = f"api:{model}"

    def embed(self, texts, kind="passage"):
        out = []
        for i in range(0, len(texts), 64):
            r = self.client.embeddings.create(model=self.model, input=texts[i:i + 64])
            out += [normalize_vec(d.embedding) for d in r.data]
        return out


def make_embedder(config):
    p = config.EMBED_PROVIDER
    if p == "hashing":
        return HashingEmbedder()
    if p == "fastembed":
        return FastEmbedEmbedder(config.EMBED_MODEL)
    if p == "api":
        if not config.EMBED_API_KEY:
            raise ValueError("EMBED_API_KEY is empty")
        return OpenAICompatEmbedder(config.EMBED_MODEL, config.EMBED_BASE_URL, config.EMBED_API_KEY)
    raise ValueError(f"Unknown EMBED_PROVIDER '{p}' (use hashing, fastembed or api)")
