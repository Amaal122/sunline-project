from app.core.database import get_db
from app.core.deps import get_optional_current_user, get_current_admin_user
from app.core.config import settings
from app.services.email import send_escalation_email
from sunline_agent import config
from sunline_agent.api import build_agent_router
from sunline_agent.admin_api import build_admin_router
from sunline_agent.db import make_session_factory
from sunline_agent.embeddings import make_embedder
from sunline_agent.kb import KnowledgeBase, make_kb_session_factory
from sunline_agent.llm import make_llm
import redis
from sunline_agent.conversations import RedisStore

store = RedisStore(redis.Redis.from_url(settings.REDIS_URL))
llm = make_llm(config)
kb = KnowledgeBase(make_kb_session_factory(config.KB_DATABASE_URL), make_embedder(config), config.KB_MIN_SCORE)
log_sf = make_session_factory(config.LOG_DATABASE_URL)

router = build_agent_router(get_db=get_db, get_optional_user=get_optional_current_user,
                            llm=llm, kb=kb, log_sf=log_sf, store=store,
                            send_escalation_email=send_escalation_email)

# must stay below log_sf
admin_router = build_admin_router(get_admin=get_current_admin_user, log_sf=log_sf)