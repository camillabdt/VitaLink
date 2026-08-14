"""Add immutable authorization revision history.

Revision ID: 56e9c3f5a8b2
Revises: 55d8b2e4f7a1
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "56e9c3f5a8b2"
down_revision = "55d8b2e4f7a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create immutable authorization revisions."""
    op.create_table(
        "authorization_revisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("authorization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("categories", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("operations", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("justification", sa.String(length=500), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["authorization_id"], ["authorizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Remove immutable authorization revisions."""
    op.drop_table("authorization_revisions")
