from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from .db import AgentEscalation


class EscalationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    run_id: int | None = None
    reason: str | None = None
    summary: str | None = None
    language: str | None = None
    order_number: str | None = None
    status: str


class StatusIn(BaseModel):
    status: Literal["open", "done"]


def build_admin_router(*, get_admin, log_sf) -> APIRouter:
    """get_admin: your dependency that returns the user only if is_admin (else 401/403)."""
    router = APIRouter()

    @router.get("/escalations", response_model=list[EscalationOut])
    def list_escalations(status: Literal["open", "done"] | None = None,
                         limit: int = Query(50, ge=1, le=200),
                         admin=Depends(get_admin)):
        with log_sf() as s:
            q = select(AgentEscalation).order_by(AgentEscalation.created_at.desc()).limit(limit)
            if status:
                q = q.where(AgentEscalation.status == status)
            return [EscalationOut.model_validate(r) for r in s.execute(q).scalars().all()]

    @router.patch("/escalations/{esc_id}", response_model=EscalationOut)
    def set_status(esc_id: int, body: StatusIn, admin=Depends(get_admin)):
        with log_sf() as s:
            row = s.get(AgentEscalation, esc_id)
            if row is None:
                raise HTTPException(status_code=404, detail="Not found")
            row.status = body.status
            s.commit()
            return EscalationOut.model_validate(row)

    return router