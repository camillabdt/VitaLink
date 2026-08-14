"""Add immutable clinical messages.

Revision ID: 62c9e0f1a2b3
Revises: 61b8d9e0f1a2
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "62c9e0f1a2b3"
down_revision: str | None = "61b8d9e0f1a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create append-only clinical messages."""
    op.create_table(
        "clinical_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_professional_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recipient_professional_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("mention_professional_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("corrects_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("correction_reason", sa.String(length=500), nullable=True),
        sa.Column("recipient_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "sender_professional_id <> recipient_professional_id",
            name="ck_clinical_messages_distinct_parties",
        ),
        sa.CheckConstraint(
            "(corrects_id IS NULL AND correction_reason IS NULL) OR "
            "(corrects_id IS NOT NULL AND correction_reason IS NOT NULL)",
            name="ck_clinical_messages_correction_reason",
        ),
        sa.ForeignKeyConstraint(["corrects_id"], ["clinical_messages.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["recipient_professional_id"], ["professionals.id"]),
        sa.ForeignKeyConstraint(["sender_professional_id"], ["professionals.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("corrects_id"),
    )


def downgrade() -> None:
    """Remove clinical messages."""
    op.drop_table("clinical_messages")
