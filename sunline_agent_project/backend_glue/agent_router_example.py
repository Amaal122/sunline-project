"""Copy to  backend/app/routers/agent.py  (adjust the imports to your project).

Differences from the first version:
  * the agent reads the shop with its OWN limited database role (AGENT_DATABASE_URL), not the backend's full account;
  * conversations, lockouts and rate limits live in Redis;
  * logs and support cases go to their own database (LOG_DATABASE_URL), ideally PostgreSQL.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.deps import get_optional_current_user
from sunline_agent import config
from sunline_agent.api import build_agent_router
from sunline_agent.db import make_session_factory
from sunline_agent.embeddings import make_embedder
from sunline_agent.kb import KnowledgeBase, make_kb_session_factory
from sunline_agent.llm import make_llm
from sunline_agent.state import redis_state

# 1. Limited read-only connection for the shop data (role created with: python -m sunline_agent.grants)
_agent_engine = create_engine(os.environ["AGENT_DATABASE_URL"], pool_pre_ping=True,
                              connect_args={"client_encoding": "utf8"})
_AgentSession = sessionmaker(bind=_agent_engine, autocommit=False, autoflush=False)


def get_agent_db():
    db = _AgentSession()
    try:
        yield db
    finally:
        db.close()


# 2. Model, knowledge base, logs
llm = make_llm(config)
kb = KnowledgeBase(make_kb_session_factory(config.KB_DATABASE_URL), make_embedder(config), config.KB_MIN_SCORE)
log_sf = make_session_factory(config.LOG_DATABASE_URL)

# 3. Router. get_optional_current_user still comes from YOUR login: it uses the backend's own session
#    internally (Depends(get_db)), which is fine: the agent never sees that connection.
router = build_agent_router(get_db=get_agent_db, get_optional_user=get_optional_current_user,
                            llm=llm, kb=kb, log_sf=log_sf,
                            **redis_state(os.environ.get("REDIS_URL", "redis://localhost:6379/0")))
