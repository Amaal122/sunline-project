"""Human handoff: record the case for the team and tell the customer how to reach them.

The summary is written by the model, so personal data the customer typed (phone numbers,
emails) is masked BEFORE it is stored."""
import re
from typing import Literal

from pydantic import BaseModel, Field

from . import config
from .db import AgentEscalation
from .order_tools import _as_uuid, _clean_order_number

Reason = Literal["cancellation", "order_change", "wrong_or_damaged_item", "payment_problem",
                 "delivery_problem", "complaint", "return_request", "locked_out", "other"]


class EscalateArgs(BaseModel):
    reason: Reason = Field(description="Why a human is needed.")
    summary: str = Field(max_length=500, description="2-3 sentences for the team: what the customer wants "
                         "and what was already tried. Do NOT include phone numbers, emails or addresses.")
    language: str = Field("fr", max_length=20, description="Customer's language: fr, ar, darija or en.")
    order_number: str | None = Field(None, max_length=40, description="Order number, if the case is about one.")


_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_PHONE = re.compile(r"\+?\d[\d\s().-]{6,}\d")


def redact(text: str) -> str:
    return _PHONE.sub("[number]", _EMAIL.sub("[email]", text or ""))


def escalate_to_human(session, args: EscalateArgs, ctx: dict):
    log_sf = ctx.get("log_sf")
    if log_sf is None:
        raise RuntimeError("Escalation storage is not configured")
    limiter, key = ctx.get("limiter"), f"escalation:{ctx.get('session_id', 'anonymous')}"
    configured = bool(config.ESCALATION_CONTACT.strip())
    contact = ({"contact": config.ESCALATION_CONTACT, "hours": config.ESCALATION_HOURS or None} if configured
               else {"contact": None, "hours": None})
    how = ("Tell the customer the request is recorded under this reference and how to reach the team, "
           "exactly as given here. Do not promise a response time or an outcome." if configured else
           "Tell the customer the request is recorded under this reference and the team will review it. "
           "NO contact details are configured: do not mention WhatsApp, email, phone or opening hours, and "
           "do not invent any. Do not promise a response time or an outcome.")
    if limiter and limiter.blocked(key):
        return {"recorded": False, **contact,
                "instruction": "Several requests were already recorded in this conversation. Do not record "
                               "another one."
                               + (" Only give the customer the contact details." if configured else "")}
    who = "logged-in customer" if _as_uuid(ctx.get("user_id")) else "GUEST, identity NOT verified"
    with log_sf() as s:
        row = AgentEscalation(run_id=ctx.get("run_id"), reason=args.reason,
                              summary=f"[{who}] " + redact(args.summary),
                              language=args.language, order_number=_clean_order_number(args.order_number or ""))
        s.add(row)
        s.commit()
        ref = f"ESC-{row.id:05d}"
    notify = ctx.get("send_escalation_email")
    if notify:
        notify(ref, args.reason, redact(args.summary), args.language,
               _clean_order_number(args.order_number or "") or None)
    if limiter:
        limiter.record_failure(key)          # reused as a counter: at most 5 cases per conversation window
    return {"recorded": True, "reference": ref, **contact,
            "instruction": how}
