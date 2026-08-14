"""add recovery credential expiration

Revision ID: 51a1f3d8c2b7
Revises: 29c9544a59f0
Create Date: 2026-08-13 21:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "51a1f3d8c2b7"
down_revision: str | None = "29c9544a59f0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply the schema change."""
    op.add_column("recovery_credentials", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Revert the schema change."""
    op.drop_column("recovery_credentials", "expires_at")
