import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# "openai_compat" = any hosted OpenAI-compatible API (Groq, OpenRouter, Together...) or local Ollama
# "anthropic"     = Claude API
PROVIDER = os.getenv("PROVIDER", "openai_compat")
MODEL = os.getenv("MODEL", "llama-3.3-70b-versatile")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///demo.db")
LOG_DATABASE_URL = os.getenv("LOG_DATABASE_URL", "sqlite:///agent_logs.db")

# ---- knowledge base (week 2)
KB_DATABASE_URL = os.getenv("KB_DATABASE_URL", "sqlite:///kb.db")
KB_DIR = os.getenv("KB_DIR", "knowledge")
KB_MIN_SCORE = float(os.getenv("KB_MIN_SCORE", "0.2"))   # below this, "I don't know"; tune from logs
EMBED_PROVIDER = os.getenv("EMBED_PROVIDER", "hashing")   # hashing | fastembed | api
EMBED_MODEL = os.getenv("EMBED_MODEL", "")
EMBED_BASE_URL = os.getenv("EMBED_BASE_URL", "")
EMBED_API_KEY = os.getenv("EMBED_API_KEY", "")

MAX_STEPS = 6            # hard cap on LLM calls per user message
TOKEN_BUDGET = 20_000    # hard cap on total tokens per run
MAX_OUTPUT_TOKENS = 1024
MAX_HISTORY_TURNS = 4    # previous Q&A pairs sent back to the model (keeps tokens low)