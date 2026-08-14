"""Add professional validation decisions.

Revision ID: 52b4a7d9e5f2
Revises: 52a3f6c8d4e1
"""

import sqlalchemy as sa
from alembic import op

revision = "52b4a7d9e5f2"
down_revision = "52a3f6c8d4e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add operator, decision, justification, and decision time."""
    op.add_column("professionals", sa.Column("validation_operator_id", sa.String(length=64), nullable=True))
    op.add_column("professionals", sa.Column("validation_decision", sa.String(length=16), nullable=True))
    op.add_column("professionals", sa.Column("validation_justification", sa.String(length=500), nullable=True))
    op.add_column("professionals", sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove professional validation decision fields."""
    op.drop_column("professionals", "validated_at")
    op.drop_column("professionals", "validation_justification")
    op.drop_column("professionals", "validation_decision")
    op.drop_column("professionals", "validation_operator_id")
