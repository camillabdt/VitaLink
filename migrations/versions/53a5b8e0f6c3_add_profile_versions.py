"""Add profile versions for optimistic concurrency.

Revision ID: 53a5b8e0f6c3
Revises: 52b4a7d9e5f2
"""

import sqlalchemy as sa
from alembic import op

revision = "53a5b8e0f6c3"
down_revision = "52b4a7d9e5f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add a server-controlled version to each owned profile."""
    op.add_column("patients", sa.Column("version", sa.Integer(), server_default="1", nullable=False))
    op.add_column("professionals", sa.Column("version", sa.Integer(), server_default="1", nullable=False))


def downgrade() -> None:
    """Remove owned profile versions."""
    op.drop_column("professionals", "version")
    op.drop_column("patients", "version")
