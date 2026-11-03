from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from .db import AgentEscalation


class EscalationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    run_id: Optional[int] = None
    reason: Optional[str] = None
    summary: Optional[str] = None
    language: Optional[str] = None
    order_number: Optional[str] = None
    status: str


class StatusIn(BaseModel):
    status: Literal["open", "done"]


def build_admin_router(*, get_admin, log_sf) -> APIRouter:
    """get_admin: your dependency that returns the user only if is_admin (else 401/403)."""
    router = APIRouter()

    @router.get("/escalations", response_model=list[EscalationOut])
    def list_escalations(status: Optional[Literal["open", "done"]] = None,
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