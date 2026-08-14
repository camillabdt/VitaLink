"""Add scoped temporary authorizations.

Revision ID: 55d8b2e4f7a1
Revises: 54c7a1d3e8b2
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "55d8b2e4f7a1"
down_revision = "54c7a1d3e8b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create scoped temporary authorizations."""
    op.create_table(
        "authorizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("access_request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("professional_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("categories", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("operations", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["access_request_id"], ["access_requests.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["professional_id"], ["professionals.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("access_request_id"),
    )


def downgrade() -> None:
    """Remove scoped temporary authorizations."""
    op.execute("DROP TABLE IF EXISTS authorizations")
