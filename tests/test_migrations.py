"""Database migration and append-only audit guarantees."""

from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError

from vitallink.config import get_settings


def test_fresh_migration_makes_audit_events_append_only() -> None:
    """Build a fresh schema and reject audit mutation at the PostgreSQL boundary."""
    database_name = f"vitallink_migration_test_{uuid4().hex}"
    application_url = make_url(get_settings().database_url).set(database=database_name)
    admin_url = application_url.set(database="postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    migrated_engine = create_engine(application_url)

    try:
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(f'CREATE DATABASE "{database_name}"')

        alembic_config = Config("alembic.ini")
        alembic_config.set_main_option("sqlalchemy.url", application_url.render_as_string(hide_password=False))
        command.upgrade(alembic_config, "head")

        event_id = uuid4()
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO audit_events
                        (id, action, result, reason, correlation_id, event_metadata, created_at)
                    VALUES
                        (:id, 'test.event', 'success', 'synthetic', :correlation_id, '{}'::jsonb, now())
                    """
                ),
                {"id": event_id, "correlation_id": uuid4()},
            )

        with (
            pytest.raises(DBAPIError, match="audit events are append-only"),
            migrated_engine.begin() as connection,
        ):
            connection.execute(
                text("UPDATE audit_events SET reason = 'changed' WHERE id = :id"),
                {"id": event_id},
            )
    finally:
        migrated_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)')
        admin_engine.dispose()
