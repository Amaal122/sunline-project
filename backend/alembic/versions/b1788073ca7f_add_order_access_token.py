"""add order access_token

Revision ID: b1788073ca7f
Revises: 5950d298120d
Create Date: 2026-11-04 13:11:48.150700

"""
import sqlalchemy as sa

from alembic import op

revision = 'b1788073ca7f'
down_revision = '5950d298120d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("access_token", sa.String(length=64), nullable=True))
    op.create_index(op.f("ix_orders_access_token"), "orders", ["access_token"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_orders_access_token"), table_name="orders")
    op.drop_column("orders", "access_token")