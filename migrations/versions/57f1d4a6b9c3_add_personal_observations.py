"""Add versioned personal observations.

Revision ID: 57f1d4a6b9c3
Revises: 56e9c3f5a8b2
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "57f1d4a6b9c3"
down_revision = "56e9c3f5a8b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create patient-owned versioned observations."""
    op.create_table(
        "personal_observations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("current", sa.Boolean(), nullable=False),
        sa.Column("replaces_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["replaces_id"], ["personal_observations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("replaces_id"),
    )


def downgrade() -> None:
    """Remove patient-owned versioned observations."""
    op.drop_table("personal_observations")
