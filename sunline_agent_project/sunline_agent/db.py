"""Logging tables: every run and every step (LLM call or tool call) is stored.
This is your debugging tool, your evaluation data and your audit trail."""
from datetime import datetime, timezone

from sqlalchemy import (JSON, Column, DateTime, ForeignKey, Integer, String,
                        Text, create_engine)
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

Base = declarative_base()


def _now():
    return datetime.now(timezone.utc)


class AgentRun(Base):
    __tablename__ = "agent_runs"
    id = Column(Integer, primary_key=True)
    started_at = Column(DateTime(timezone=True), default=_now)
    user_message = Column(Text)
    model = Column(String(100))
    outcome = Column(String(30))          # answered | max_steps | budget | error
    final_answer = Column(Text)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    latency_ms = Column(Integer)


class AgentStep(Base):
    __tablename__ = "agent_steps"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("agent_runs.id"), index=True)
    step_no = Column(Integer)
    type = Column(String(10))             # llm | tool
    tool_name = Column(String(100), nullable=True)
    input = Column(JSON, nullable=True)
    output = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    duration_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=_now)


def make_engine(url: str):
    if url.endswith(":memory:") or url == "sqlite://":
        return create_engine(url, poolclass=StaticPool,
                             connect_args={"check_same_thread": False})
    return create_engine(url)


def make_session_factory(url: str):
    engine = make_engine(url)
    Base.metadata.create_all(engine)
    return sessionmaker(engine, expire_on_commit=False)


def make_data_session_factory(url: str):
    """Plain session factory for the shop database: does not create any tables."""
    return sessionmaker(make_engine(url), expire_on_commit=False)
