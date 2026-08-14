"""Add confirmed versioned clinical results.

Revision ID: 59c4f6a8d1e3
Revises: 58a2e5b7c0d4
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "59c4f6a8d1e3"
down_revision = "58a2e5b7c0d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create confirmed versioned clinical result storage."""
    op.create_table(
        "clinical_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("exam_name", sa.String(length=200), nullable=False),
        sa.Column("value", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=False),
        sa.Column("measured_at", sa.Date(), nullable=False),
        sa.Column("origin", sa.String(length=200), nullable=False),
        sa.Column("reference_min", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("reference_max", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("confirmed", sa.Boolean(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("current", sa.Boolean(), nullable=False),
        sa.Column("replaces_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("correction_reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("reference_min <= reference_max", name="ck_clinical_results_reference_order"),
        sa.ForeignKeyConstraint(["author_account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["replaces_id"], ["clinical_results.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("replaces_id"),
    )


def downgrade() -> None:
    """Remove confirmed versioned clinical result storage."""
    op.drop_table("clinical_results")
