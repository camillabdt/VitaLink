"""Create professional identity records.

Revision ID: 52a3f6c8d4e1
Revises: 51b2e4f9d3c8
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "52a3f6c8d4e1"
down_revision = "51b2e4f9d3c8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create professional identities with unique CPF and CRM/UF."""
    op.create_table(
        "professionals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("cpf", sa.String(length=11), nullable=False),
        sa.Column("birthdate", sa.Date(), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("crm", sa.String(length=32), nullable=False),
        sa.Column("uf", sa.String(length=2), nullable=False),
        sa.Column("specialty", sa.String(length=120), nullable=False),
        sa.Column("institution", sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id"),
        sa.UniqueConstraint("cpf"),
        sa.UniqueConstraint("crm", "uf"),
    )


def downgrade() -> None:
    """Drop professional identity records."""
    op.drop_table("professionals")
