"""Add versioned professional clinical goals.

Revision ID: 61a7c8d9e0f1
Revises: 60d5a7b9e2f4
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "61a7c8d9e0f1"
down_revision: str | None = "60d5a7b9e2f4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create immutable clinical goal versions."""
    op.create_table(
        "clinical_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("exam_name", sa.String(length=200), nullable=False),
        sa.Column("minimum", sa.Numeric(18, 6), nullable=False),
        sa.Column("maximum", sa.Numeric(18, 6), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=False),
        sa.Column("justification", sa.String(length=500), nullable=False),
        sa.Column("effective_at", sa.Date(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("current", sa.Boolean(), nullable=False),
        sa.Column("replaces_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("correction_reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("minimum <= maximum", name="ck_clinical_goals_limit_order"),
        sa.ForeignKeyConstraint(["author_account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["replaces_id"], ["clinical_goals.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("replaces_id"),
    )


def downgrade() -> None:
    """Remove clinical goals."""
    op.drop_table("clinical_goals")
