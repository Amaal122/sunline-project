"""FastAPI router for the agent. It receives your app's own dependencies, so identity comes from
YOUR login (get_optional_user) and nothing in the request body can claim to be someone else.

In the SUNLINE backend (app/routers/agent.py):

    from app.core.database import get_db
    from app.core.deps import get_optional_current_user
    from sunline_agent.api import build_agent_router
    router = build_agent_router(get_db=get_db, get_optional_user=get_optional_current_user,
                                llm=llm, kb=kb, log_sf=log_session_factory)
    # main.py:  app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
"""
import logging
import re
import uuid
from contextlib import nullcontext
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from . import config
from .agent import run_agent
from .conversations import MemoryStore
from .limits import AttemptLimiter, RateLimiter


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    conversation_id: Optional[str] = Field(None, pattern=r"^[0-9a-f]{32}$")
    # There is deliberately NO history, user, role or email field: the server decides all of that.


class ChatOut(BaseModel):
    reply: str
    conversation_id: str


_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def build_agent_router(*, get_db, get_optional_user, llm, kb, log_sf, store=None, limiter=None,
                       ip_limiter=None, rate_limiter=None, ip_rate_limiter=None) -> APIRouter:
    router = APIRouter()
    if not config.ESCALATION_CONTACT.strip():
        logging.getLogger("sunline_agent").warning(
            "ESCALATION_CONTACT is empty: customers will get a case reference but no way to reach the team.")
    store = store or MemoryStore()
    limiter = limiter or AttemptLimiter(max_failures=5, window_seconds=900)           # per session / order
    ip_limiter = ip_limiter or AttemptLimiter(max_failures=25, window_seconds=900)    # per IP (shared mobile IPs)
    rate = rate_limiter or RateLimiter(max_events=20, window_seconds=60)              # messages per identity
    ip_rate = ip_rate_limiter or RateLimiter(max_events=60, window_seconds=600)       # messages per IP

    @router.post("/chat", response_model=ChatOut)
    def chat(payload: ChatIn, request: Request, db=Depends(get_db), user=Depends(get_optional_user)):
        # Behind a proxy request.client is the proxy: run uvicorn with --proxy-headers and trusted hosts.
        ip = request.client.host if request.client else "unknown"
        user_id = str(user.id) if user is not None else None
        owner = f"user:{user_id}" if user_id else "guest"
        if not rate.allow(f"chat:{owner if user_id else 'ip:' + ip}") or not ip_rate.allow(f"chat-ip:{ip}"):
            raise HTTPException(status_code=429, detail="Trop de messages. Réessayez dans une minute.")

        conv = store.get(payload.conversation_id) if payload.conversation_id else None
        if conv is None or conv["owner"] != owner:    # unknown, expired, or someone else's: start fresh (no hint why)
            conversation_id, history = uuid.uuid4().hex, []
        else:
            conversation_id, history = payload.conversation_id, conv["history"]

        ctx = {"kb": kb, "user_id": user_id, "limiter": limiter, "ip_limiter": ip_limiter,
               "client_ip": ip, "session_id": conversation_id}
        message = _CONTROL.sub("", payload.message).strip()
        if not message:
            raise HTTPException(status_code=422, detail="Message vide.")
        result = run_agent(message, llm, lambda: nullcontext(db), log_sf, history=history, ctx=ctx)
        store.put(conversation_id, owner, result.history)
        return ChatOut(reply=result.answer, conversation_id=conversation_id)

    return router
