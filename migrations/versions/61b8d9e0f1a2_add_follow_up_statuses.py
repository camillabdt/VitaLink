"""Add versioned manual follow-up statuses.

Revision ID: 61b8d9e0f1a2
Revises: 61a7c8d9e0f1
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "61b8d9e0f1a2"
down_revision: str | None = "61a7c8d9e0f1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create immutable manual follow-up versions."""
    op.create_table(
        "follow_up_statuses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=120), nullable=False),
        sa.Column("justification", sa.String(length=500), nullable=False),
        sa.Column("recorded_at", sa.Date(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("current", sa.Boolean(), nullable=False),
        sa.Column("replaces_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("correction_reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["replaces_id"], ["follow_up_statuses.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("replaces_id"),
    )


def downgrade() -> None:
    """Remove manual follow-up states."""
    op.drop_table("follow_up_statuses")
