from functools import lru_cache

import redis

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_admin_user, get_optional_current_user
from app.services.email import notify_escalation_async
from sunline_agent import config
from sunline_agent.admin_api import build_admin_router
from sunline_agent.api import build_agent_router
from sunline_agent.conversations import RedisStore
from sunline_agent.db import make_session_factory
from sunline_agent.embeddings import make_embedder
from sunline_agent.kb import KnowledgeBase, make_kb_session_factory
from sunline_agent.llm import make_llm

log_sf = make_session_factory(config.LOG_DATABASE_URL)
store = RedisStore(redis.Redis.from_url(settings.REDIS_URL))
kb = KnowledgeBase(
    make_kb_session_factory(config.KB_DATABASE_URL),
    make_embedder(config),
    config.KB_MIN_SCORE,
)


@lru_cache(maxsize=1)
def get_llm():
    return make_llm(config)


class LazyLLM:
    """Proxy: le vrai client n'est créé qu'au premier appel."""

    def __getattr__(self, name):
        return getattr(get_llm(), name)

    def __call__(self, *args, **kwargs):
        return get_llm()(*args, **kwargs)


llm = LazyLLM()

router = build_agent_router(
    get_db=get_db,
    get_optional_user=get_optional_current_user,
    llm=llm,
    kb=kb,
    log_sf=log_sf,
    store=store,
    send_escalation_email=notify_escalation_async,
)

# must stay below log_sf
admin_router = build_admin_router(get_admin=get_current_admin_user, log_sf=log_sf)
