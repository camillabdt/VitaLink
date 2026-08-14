"""Add immutable professional records.

Revision ID: 60d5a7b9e2f4
Revises: 59c4f6a8d1e3
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "60d5a7b9e2f4"
down_revision = "59c4f6a8d1e3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create versioned consultation, note, and recommendation storage."""
    op.create_table(
        "professional_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("justification", sa.String(length=500), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("origin", sa.String(length=32), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("current", sa.Boolean(), nullable=False),
        sa.Column("replaces_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("correction_reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "kind IN ('consultation', 'note', 'recommendation')",
            name="ck_professional_records_kind",
        ),
        sa.ForeignKeyConstraint(["author_account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["replaces_id"], ["professional_records.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("replaces_id"),
    )


def downgrade() -> None:
    """Remove professional record storage."""
    op.drop_table("professional_records")
