"""Relational persistence for identity and audit data."""

from collections.abc import Iterator
from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    create_engine,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from vitallink.config import get_settings


class Base(DeclarativeBase):
    """Declarative base for VitaLink database models."""


class Account(Base):
    """An individual VitaLink account awaiting or holding activation."""

    __tablename__ = "accounts"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    patient: Mapped["Patient"] = relationship(back_populates="account", cascade="all, delete-orphan")
    professional: Mapped["Professional"] = relationship(back_populates="account", cascade="all, delete-orphan")


class Patient(Base):
    """Patient identity data owned by one account."""

    __tablename__ = "patients"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    cpf: Mapped[str] = mapped_column(String(11), unique=True, nullable=False)
    birthdate: Mapped[date] = mapped_column(Date, nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    blood_type: Mapped[str | None] = mapped_column(String(3))
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    account: Mapped[Account] = relationship(back_populates="patient")


class Professional(Base):
    """Professional identity data awaiting or holding manual validation."""

    __tablename__ = "professionals"
    __table_args__ = (UniqueConstraint("crm", "uf"),)

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    cpf: Mapped[str] = mapped_column(String(11), unique=True, nullable=False)
    birthdate: Mapped[date] = mapped_column(Date, nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    crm: Mapped[str] = mapped_column(String(32), nullable=False)
    uf: Mapped[str] = mapped_column(String(2), nullable=False)
    specialty: Mapped[str] = mapped_column(String(120), nullable=False)
    institution: Mapped[str | None] = mapped_column(String(200))
    validation_operator_id: Mapped[str | None] = mapped_column(String(64))
    validation_decision: Mapped[str | None] = mapped_column(String(16))
    validation_justification: Mapped[str | None] = mapped_column(String(500))
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    account: Mapped[Account] = relationship(back_populates="professional")


class AccessCode(Base):
    """Single-use patient access code retained only as a keyed digest."""

    __tablename__ = "access_codes"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    code_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AccessRequest(Base):
    """Professional request awaiting an explicit patient decision."""

    __tablename__ = "access_requests"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    professional_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("professionals.id"), nullable=False
    )
    justification: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class Authorization(Base):
    """Patient-granted professional access with explicit scope and term."""

    __tablename__ = "authorizations"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    access_request_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("access_requests.id"), unique=True, nullable=False
    )
    patient_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    professional_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("professionals.id"), nullable=False
    )
    categories: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    operations: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AuthorizationRevision(Base):
    """Immutable authorization state captured before a patient change."""

    __tablename__ = "authorization_revisions"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    authorization_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("authorizations.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    categories: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    operations: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    justification: Mapped[str] = mapped_column(String(500), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PersonalObservation(Base):
    """Versioned health observation authored and owned by one patient."""

    __tablename__ = "personal_observations"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    author_account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    replaces_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("personal_observations.id"), unique=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class Document(Base):
    """Private patient document stored under a server-generated object key."""

    __tablename__ = "documents"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    uploaded_by_account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    content_type: Mapped[str] = mapped_column(String(64), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class ClinicalResult(Base):
    """Confirmed versioned measurement with immutable authorship and origin."""

    __tablename__ = "clinical_results"
    __table_args__ = (
        CheckConstraint("reference_min <= reference_max", name="ck_clinical_results_reference_order"),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    author_account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False
    )
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    measured_at: Mapped[date] = mapped_column(Date, nullable=False)
    origin: Mapped[str] = mapped_column(String(200), nullable=False)
    reference_min: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    reference_max: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    replaces_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("clinical_results.id"), unique=True
    )
    correction_reason: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class ProfessionalRecord(Base):
    """Immutable version of a patient record authored by a professional."""

    __tablename__ = "professional_records"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('consultation', 'note', 'recommendation')",
            name="ck_professional_records_kind",
        ),
    )

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    author_account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    justification: Mapped[str] = mapped_column(String(500), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    origin: Mapped[str] = mapped_column(String(32), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    replaces_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("professional_records.id"), unique=True
    )
    correction_reason: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class ClinicalGoal(Base):
    """Immutable professional-authored target for one structured exam."""

    __tablename__ = "clinical_goals"
    __table_args__ = (CheckConstraint("minimum <= maximum", name="ck_clinical_goals_limit_order"),)

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    author_account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False
    )
    exam_name: Mapped[str] = mapped_column(String(200), nullable=False)
    minimum: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    maximum: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    justification: Mapped[str] = mapped_column(String(500), nullable=False)
    effective_at: Mapped[date] = mapped_column(Date, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    replaces_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("clinical_goals.id"), unique=True
    )
    correction_reason: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class FollowUpStatus(Base):
    """Immutable manual follow-up state authored by one professional."""

    __tablename__ = "follow_up_statuses"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    author_account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(120), nullable=False)
    justification: Mapped[str] = mapped_column(String(500), nullable=False)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    replaces_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("follow_up_statuses.id"), unique=True
    )
    correction_reason: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class Notification(Base):
    """Internal account notification linked to a domain event."""

    __tablename__ = "notifications"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(64), nullable=False)
    subject_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EmailVerification(Base):
    """Single-use confirmation code stored only as a keyed digest."""

    __tablename__ = "email_verifications"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AccountSession(Base):
    """Opaque server-side session with an explicit permitted purpose."""

    __tablename__ = "account_sessions"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TotpCredential(Base):
    """Encrypted TOTP secret enrolled for one account."""

    __tablename__ = "totp_credentials"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), unique=True, nullable=False
    )
    secret_ciphertext: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class StepUpConfirmation(Base):
    """Short-lived action confirmation bound to one authenticated session."""

    __tablename__ = "step_up_confirmations"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    session_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), ForeignKey("account_sessions.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RecoveryCredential(Base):
    """A single-use recovery value retained only as a keyed digest."""

    __tablename__ = "recovery_credentials"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    value_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LoginThrottle(Base):
    """Progressive login limit keyed by pseudonymous account and origin."""

    __tablename__ = "login_throttles"
    __table_args__ = (UniqueConstraint("target_id", "origin_id"),)

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    origin_id: Mapped[str] = mapped_column(String(64), nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    blocked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuditEvent(Base):
    """Append-only security event with pseudonymous identifiers."""

    __tablename__ = "audit_events"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    actor_id: Mapped[str | None] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_id: Mapped[str | None] = mapped_column(String(64))
    result: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str] = mapped_column(String(64), nullable=False)
    correlation_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    event_metadata: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


settings = get_settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionFactory = sessionmaker(bind=engine, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """Provide one database transaction scope to an API request.

    Yields:
        A SQLAlchemy session closed after the request.
    """
    with SessionFactory() as session:
        yield session
